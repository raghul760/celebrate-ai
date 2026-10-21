import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
const distPath = path.resolve(__dirname, '../dist')

const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const host = process.env.API_HOST || '0.0.0.0'
const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const requestLimit = 32 * 1024
const rateLimitWindow = 60_000
const rateLimitMaximum = 10
const requestsByAddress = new Map()

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

function checkRateLimit(address) {
  const now = Date.now()
  const existing = requestsByAddress.get(address)
  if (!existing || now - existing.startedAt >= rateLimitWindow) {
    requestsByAddress.set(address, { startedAt: now, count: 1 })
    if (requestsByAddress.size > 1000) {
      for (const [key, value] of requestsByAddress) {
        if (now - value.startedAt >= rateLimitWindow) requestsByAddress.delete(key)
      }
    }
    return
  }

  existing.count += 1
  if (existing.count > rateLimitMaximum) {
    throw new ApiError(429, 'Too many plans requested. Please wait a minute and try again.')
  }
}

async function readJson(request) {
  const chunks = []
  let size = 0

  for await (const chunk of request) {
    size += chunk.length
    if (size > requestLimit) {
      throw new ApiError(413, 'The request is too large.')
    }
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new ApiError(400, 'Please provide valid event details.')
  }
}

function validateEvent(value) {
  const allowedTypes = ['Birthday', 'Wedding', 'Community Event']
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Please provide valid event details.')
  }

  const { eventType, date, location } = value
  const guests = Number(value.guests)
  const budget = Number(value.budget)
  const parsedDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00Z`)
    : null

  if (!allowedTypes.includes(eventType)) {
    throw new ApiError(400, 'Choose a birthday, wedding, or community event.')
  }
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, 'Enter a valid event date.')
  }
  if (parsedDate.getTime() < new Date().setUTCHours(0, 0, 0, 0)) {
    throw new ApiError(400, 'Choose a date that is today or later.')
  }
  if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 120) {
    throw new ApiError(400, 'Enter a location between 2 and 120 characters.')
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 1000) {
    throw new ApiError(400, 'Guest count must be between 1 and 1,000.')
  }
  if (!Number.isInteger(budget) || budget < 1000 || budget > 100_000_000) {
    throw new ApiError(400, 'Budget must be between ₹1,000 and ₹10,00,00,000.')
  }

  return { eventType, date, location: location.trim(), guests, budget }
}

function makePrompt(event) {
  return `Create a warm, specific, realistic event plan for this Indian celebration:
- Occasion: ${event.eventType}
- Date: ${event.date}
- Location: ${event.location}
- Guests: ${event.guests}
- Total budget: ₹${event.budget} INR

Return one JSON object only, with exactly these fields and types:
{
  "title": "short personalized plan title",
  "theme": {
    "name": "short theme name",
    "description": "2-3 sentences about the mood and personal fit",
    "vibe": "2-4 words",
    "palette": ["3-5 simple color names"],
    "styling": ["3 practical decor or styling suggestions"]
  },
  "budget": {
    "items": [{"category": "short category", "amount": 1000, "notes": "brief detail"}],
    "savings_tip": "one actionable, respectful saving tip"
  },
  "timeline": [{"when": "time before the event", "task": "one actionable task"}],
  "vendors": [{"category": "vendor type", "priority": "high", "notes": "brief booking advice"}],
  "catering": {
    "welcome_drinks": ["drink ideas"],
    "menu": ["dish ideas"],
    "dessert": "dessert idea",
    "dietary_note": "inclusive dietary suggestion"
  },
  "activities": ["activity ideas"]
}

Requirements:
- Respond with practical, delightful suggestions tailored to the occasion, guest count, location, and date.
- Use Indian Rupees (INR); all budget item amounts must be whole-number INR amounts and their sum must not exceed ₹${event.budget}.
- Include 4-6 budget items, 4-6 timeline steps, 4-6 vendor suggestions, and 3-5 activities.
- Suggest local, culturally considerate food and celebration ideas; avoid claiming specific vendor availability or exact market prices.
- Use only the requested JSON structure. Do not include markdown or extra fields.`
}

function validatePlan(plan) {
  const isString = (value) => typeof value === 'string' && value.trim().length > 0
  const isStringArray = (value) => Array.isArray(value) && value.length > 0 && value.every(isString)

  if (!plan || typeof plan !== 'object' || !isString(plan.title)) {
    throw new Error('The AI response did not include a plan title.')
  }
  if (!plan.theme || !isString(plan.theme.name) || !isString(plan.theme.description)) {
    throw new Error('The AI response did not include a complete theme.')
  }
  if (!plan.budget || !Array.isArray(plan.budget.items) || !plan.budget.items.length) {
    throw new Error('The AI response did not include a budget breakdown.')
  }
  if (!plan.budget.items.every((item) => (
    item && isString(item.category) && Number.isInteger(item.amount) && item.amount >= 0
  ))) {
    throw new Error('The AI response included an invalid budget breakdown.')
  }
  if (!Array.isArray(plan.timeline) || !plan.timeline.every((item) => item && isString(item.when) && isString(item.task))) {
    throw new Error('The AI response did not include a complete timeline.')
  }
  if (!Array.isArray(plan.vendors) || !plan.vendors.every((item) => item && isString(item.category) && isString(item.notes))) {
    throw new Error('The AI response did not include a complete vendor checklist.')
  }
  if (!plan.catering || !isStringArray(plan.catering.menu) || !isStringArray(plan.activities)) {
    throw new Error('The AI response did not include catering and activity ideas.')
  }

  return {
    title: plan.title,
    theme: {
      name: plan.theme.name,
      description: plan.theme.description,
      vibe: typeof plan.theme.vibe === 'string' ? plan.theme.vibe : '',
      palette: Array.isArray(plan.theme.palette) ? plan.theme.palette.filter(isString).slice(0, 5) : [],
      styling: Array.isArray(plan.theme.styling) ? plan.theme.styling.filter(isString).slice(0, 6) : [],
    },
    budget: {
      items: plan.budget.items.slice(0, 8).map((item) => ({
        category: item.category,
        amount: item.amount,
        notes: typeof item.notes === 'string' ? item.notes : '',
      })),
      savings_tip: typeof plan.budget.savings_tip === 'string' ? plan.budget.savings_tip : '',
    },
    timeline: plan.timeline.slice(0, 8).map(({ when, task }) => ({ when, task })),
    vendors: plan.vendors.slice(0, 8).map((item) => ({
      category: item.category,
      notes: item.notes,
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
    })),
    catering: {
      welcome_drinks: Array.isArray(plan.catering.welcome_drinks) ? plan.catering.welcome_drinks.filter(isString).slice(0, 5) : [],
      menu: plan.catering.menu.filter(isString).slice(0, 8),
      dessert: typeof plan.catering.dessert === 'string' ? plan.catering.dessert : '',
      dietary_note: typeof plan.catering.dietary_note === 'string' ? plan.catering.dietary_note : '',
    },
    activities: plan.activities.filter(isString).slice(0, 8),
  }
}

async function generatePlan(event) {
  if (!apiKey) {
    throw new ApiError(
      503,
      'The AI planner is not configured yet. Add GEMINI_API_KEY to your .env file, then restart the server.'
    )
  }

  let response

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are CelebrateAI, a thoughtful event planner. Give practical, culturally considerate ideas, stay within budget, and return valid JSON only.',
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: makePrompt(event) }],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(60_000),
      }
    )
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError(504, 'The planner took too long to respond. Please try again.')
    }
    throw new ApiError(502, 'We could not reach the AI planner. Please try again.')
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(502, 'Gemini rejected the API key. Check GEMINI_API_KEY in your .env file.')
    }

    if (response.status === 429) {
      throw new ApiError(503, 'Gemini usage limits were reached. Please try again later.')
    }

    console.error(`Gemini request failed with status ${response.status}.`)
    const errorBody = await response.clone().text()
    console.error('Gemini error details:', errorBody.replaceAll(apiKey, '[REDACTED]').slice(0, 2000))
    throw new ApiError(502, 'The AI planner is temporarily unavailable. Please try again.')
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new ApiError(502, 'The AI planner returned an unreadable response. Please try again.')
  }

  const content = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')

  if (typeof content !== 'string' || !content.trim()) {
    throw new ApiError(502, 'The AI planner returned an empty response. Please try again.')
  }

  try {
    const plan = JSON.parse(content)
    const validatedPlan = validatePlan(plan)

    if (validatedPlan.budget.items.reduce((sum, item) => sum + item.amount, 0) > event.budget) {
      throw new Error('The AI response exceeded the requested budget.')
    }

    return validatedPlan
  } catch (error) {
    console.error('Gemini response validation failed:', error.message)
    throw new ApiError(502, 'We could not put together a complete plan this time. Please try again.')
  }
}

app.get('/api/health', (request, response) => {
  sendJson(response, 200, { status: 'ok' })
})

app.post('/api/plan', async (request, response) => {
  try {
    checkRateLimit(request.socket.remoteAddress || 'unknown')
    const event = validateEvent(await readJson(request))
    const plan = await generatePlan(event)
    sendJson(response, 200, { plan })
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(response, error.status, { error: error.message })
      return
    }

    console.error('Unexpected plan generation error:', error)
    sendJson(response, 500, {
      error: 'Something went wrong while creating your plan. Please try again.',
    })
  }
})

app.use(express.static(distPath))

app.use((request, response) => {
  if (request.method === 'GET' && !request.path.startsWith('/api/')) {
    response.sendFile(path.join(distPath, 'index.html'))
    return
  }

  sendJson(response, 404, { error: 'Not found.' })
})

app.listen(port, host, () => {
  console.log(`CelebrateAI listening at http://${host}:${port}`)
})
