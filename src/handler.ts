import { Router } from 'itty-router'

import Posts from './handlers/posts'
import Post from './handlers/post'
import Paper from './handlers/paper'

const router = Router()

router
  .get('/api/posts', Posts)
  .get('/api/posts/:id', Post)
  .post('/api/paper', Paper)
  .get('*', () => new Response("Not found", { status: 404 }))

export const handleRequest = request => router.handle(request)