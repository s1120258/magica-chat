import { Mastra } from '@mastra/core/agent'
import { emmaAgent } from './emma-agent'

export const mastra = new Mastra({
  agents: { emma: emmaAgent },
})

export { emmaAgent }
