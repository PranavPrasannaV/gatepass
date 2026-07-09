export async function runAgent(task) {
  const MAX_STEPS = 10;
  for (let i = 0; i < MAX_STEPS; i++) {
    const result = await agent.run(task);
    if (result.done) break;
    task = result.next;
  }
}
