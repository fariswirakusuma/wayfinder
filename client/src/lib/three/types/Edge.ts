import type { Node } from '../types/Node';

export interface Edge {
  targetNode: Node;
  weight: number;
  isBlocked?: boolean;
}