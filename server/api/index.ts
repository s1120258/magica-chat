import { Hono } from 'hono'
import { chatRoutes } from './chat'

const app = new Hono().basePath('/api')

app.route('/chat', chatRoutes)

export default app
