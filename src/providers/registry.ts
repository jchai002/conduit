import { BusinessContextProvider } from "./businessContextProvider";
import { CodingAgent } from "./codingAgent";

/**
 * Central registry for business context providers and coding agents.
 * Extension registers available providers on activate; orchestration
 * looks them up by ID from user config.
 */
export class ProviderRegistry {
  private businessContextProviders = new Map<string, BusinessContextProvider>();
  private codingAgents = new Map<string, CodingAgent>();

  registerBusinessContext(provider: BusinessContextProvider): void {
    this.businessContextProviders.set(provider.id, provider);
  }

  registerCodingAgent(agent: CodingAgent): void {
    this.codingAgents.set(agent.id, agent);
  }

  getBusinessContext(id: string): BusinessContextProvider | undefined {
    return this.businessContextProviders.get(id);
  }

  getCodingAgent(id: string): CodingAgent | undefined {
    return this.codingAgents.get(id);
  }

  getAllBusinessContextProviders(): BusinessContextProvider[] {
    return Array.from(this.businessContextProviders.values());
  }

  getAllCodingAgents(): CodingAgent[] {
    return Array.from(this.codingAgents.values());
  }
}
