export async function runAgent(task) {
  while (true) {
    const result = await agent.run(task);
    task = result.next;
  }
}
