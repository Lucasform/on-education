'use client';

import { createContext, useContext, type ReactNode } from 'react';

const AgentNameContext = createContext<string>('WayOn');

export function AgentNameProvider({ name, children }: { name: string; children: ReactNode }) {
  return <AgentNameContext.Provider value={name}>{children}</AgentNameContext.Provider>;
}

export function useAgentName() {
  return useContext(AgentNameContext);
}

/** Inline replacement for "WayOn" in any JSX — reads from context. */
export function AgentNameText() {
  const name = useAgentName();
  return <>{name}</>;
}
