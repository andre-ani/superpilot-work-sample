import { defineTool } from 'eve/tools'
import { adDirectionRequestSchema } from '../../src/lib/ad-directions'
import { developAdDirections } from '../../src/lib/ad-directions.server'
export default defineTool({description:'Develop or read cached evidence-backed Instagram ad directions from the exact collected brand/product context. Quotes and testimonials are verified against stored research. Never generates an image.',inputSchema:adDirectionRequestSchema,async execute(input){return{kind:'ad-directions',snapshotId:input.snapshotId,...await developAdDirections(input)}}})
