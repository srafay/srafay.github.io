/*
  Data flowing through the graph while it idles: now and then a cell runs along one link from the router to a tool,
  the tool pulses once, and the cell runs back, as a message would go to a tool and its answer return. Nothing runs
  under reduced motion, while held, or while a trick plays (a trick sends its own).
*/
import { NODE_COUNT } from "./topology";

/** How long a cell takes along a link one way, how long the tool holds it, in seconds. */
const ONE_WAY = 0.45;
const AT_THE_TOOL = 0.25;
/** The quiet between messages: four to seven seconds. */
const quietAfter = () => 4 + Math.random() * 3;

/** Where the idle message is: on which link, how far from the router (0) to the tool (1), and whether the tool holds it. */
export type MessageState = { node: number; along: number; atTool: boolean };

export class Messenger {
  private node = 1;
  private started = -1;
  private nextAt = 2.2;

  /** The message at a time, or null between messages. Paused, nothing starts; one under way finishes. */
  at(seconds: number, paused: boolean): MessageState | null {
    if (this.started < 0) {
      if (paused || seconds < this.nextAt) return null;
      this.started = seconds;
      this.node = 1 + Math.floor(Math.random() * (NODE_COUNT - 1));
    }
    const into = seconds - this.started;
    const length = ONE_WAY * 2 + AT_THE_TOOL;
    if (into >= length) {
      this.started = -1;
      this.nextAt = seconds + quietAfter();
      return null;
    }
    if (into < ONE_WAY) return { node: this.node, along: into / ONE_WAY, atTool: false };
    if (into < ONE_WAY + AT_THE_TOOL) return { node: this.node, along: 1, atTool: true };
    return { node: this.node, along: 1 - (into - ONE_WAY - AT_THE_TOOL) / ONE_WAY, atTool: false };
  }

  /** Sends the next message soon, for checks and crops. */
  soon(seconds: number) {
    this.started = -1;
    this.nextAt = seconds + 0.05;
  }
}
