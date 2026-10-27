import{test}from'node:test'
import assert from'node:assert/strict'
import{deriveAgentActivity,researchActivity}from'./agent-activity.ts'
test('static SDK tool parts drive real active state and terminal output clears it',()=>{
  const running=deriveAgentActivity('streaming',[],[{parts:[{type:'tool-read_brand',toolCallId:'call',state:'input-available'}]}])
  assert.equal(running.entries[0].label,'Read brand details');assert.equal(running.active,true)
  const done=deriveAgentActivity('ready',[],[{parts:[{type:'tool-read_brand',toolCallId:'call',state:'output-available'}]}])
  assert.equal(done.entries[0].state,'complete');assert.equal(done.active,false)
})
test('subagent lifecycle is visible before message projection and no private reasoning is exposed',()=>{
  const events=[{type:'task.started',data:{callId:'a',taskId:'t',name:'creative',kind:'agent',turnId:'turn'}},{type:'agent.started',data:{callId:'a',name:'creative',turnId:'turn'}},{type:'reasoning.appended',data:{reasoningDelta:'PRIVATE',turnId:'turn'}},{type:'message.appended',data:{messageDelta:'I found source-backed angles.',turnId:'turn'}}]
  const running=deriveAgentActivity('streaming',events,[]);assert.equal(running.entries[0].label,'Creative agent');assert.equal(running.summary,'I found source-backed angles.');assert.ok(!JSON.stringify(running).includes('PRIVATE'))
  const done=deriveAgentActivity('ready',[...events,{type:'task.settled',data:{callId:'a',status:'completed',turnId:'turn'}}],[]);assert.equal(done.active,false)
})
test('native research publishes only phases actually reached',()=>{
  const entries=researchActivity({sourceScanId:'s',status:'running',phase:'identity'})
  assert.deepEqual(entries.map(entry=>entry.label),['Read storefront','Verify brand identity'])
  assert.equal(entries[1].state,'running')
})

test('real running operations survive long completed chat histories',()=>{
  const messages=Array.from({length:100},(_,i)=>({parts:[{type:'tool-read_brand',toolCallId:`done-${i}`,state:'output-available'}]}))
  const activity=deriveAgentActivity('ready',[],messages,[{id:'research',kind:'operation',label:'Develop ad directions',state:'running'}])
  assert.equal(activity.active,true)
  assert.ok(activity.entries.some(entry=>entry.id==='research'))
})
