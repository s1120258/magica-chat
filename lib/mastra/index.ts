import { Mastra } from '@mastra/core'
import { emmaAgent } from './emma-agent'

export const mastra = new Mastra({
  agents: { emma: emmaAgent },
})

export { emmaAgent }
