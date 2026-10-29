/*
  The agent's graph: one router node, the head, and the tools of the assistant Syed Rafay built at Atelier hanging off
  it on links, the way a LangGraph agent is drawn. Node 0 is the router; each tool is the node after it, in this order,
  left to right across the fan.
*/

export type ToolKey = "search" | "research" | "chart" | "similar" | "focusGroup" | "route";

export const TOOL_ORDER: ToolKey[] = ["search", "research", "chart", "similar", "focusGroup", "route"];

/** The router's node. */
export const ROUTER = 0;

/** How many nodes the graph has: the router and its tools. */
export const NODE_COUNT = TOOL_ORDER.length + 1;

/** The node a tool hangs on. */
export const nodeOfTool = (tool: ToolKey) => TOOL_ORDER.indexOf(tool) + 1;

/** The tool a node holds, or null for the router. */
export const toolOfNode = (node: number): ToolKey | null => TOOL_ORDER[node - 1] ?? null;
