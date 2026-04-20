import CryptoJS from "crypto-js";
import type { OrgDataResponse, UserInfoResponse, OrgNode } from "./types.js";

const API_BASE_URL = "https://feexotel-api.flexiele.com";
const ENCRYPTION_KEY = "2e35f242a46d67eeb74aabc37d5e5d05";

function randomHexKey(): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function encryptParams(params: Record<string, unknown>): {
  queryString: string;
  headerKey: string;
} {
  const jsonStr = JSON.stringify(params);
  const encrypted = CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
  const base64Encoded = btoa(encrypted);
  const paramKey = randomHexKey();
  return {
    queryString: `${paramKey}=${encodeURIComponent(base64Encoded)}`,
    headerKey: paramKey,
  };
}

function decryptResponse(responseBody: Record<string, string>): unknown {
  // Response has a single key (random 8-char hex) with AES-encrypted value
  const keys = Object.keys(responseBody);
  if (keys.length === 0) {
    throw new Error("Empty response body");
  }
  const encryptedValue = responseBody[keys[0]];
  const decrypted = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
  const jsonStr = decrypted.toString(CryptoJS.enc.Utf8);
  if (!jsonStr) {
    throw new Error("Failed to decrypt response — check auth token validity");
  }
  return JSON.parse(jsonStr);
}

export class FlexieleClient {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  private async request(
    path: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    let url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Cookie: `fe_session_id=${encodeURIComponent(this.sessionId)}`,
      Accept: "application/json",
      Origin: "https://feexotel.flexiele.com",
      Referer: "https://feexotel.flexiele.com/",
    };

    if (params) {
      const { queryString, headerKey } = encryptParams(params);
      url += `?${queryString}`;
      headers["fe-req-encrypted"] = headerKey;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Flexiele session expired (${response.status}). Refresh in 2 steps:\n` +
          `  1. Browser Console on feexotel.flexiele.com:\n` +
          `     fetch('https://raw.githubusercontent.com/shivanand-arch/flexiele-mcp/main/get-sessionid.js').then(r=>r.text()).then(eval)\n` +
          `  2. Terminal:\n` +
          `     bash ~/flexiele-mcp/refresh-session.sh`
        );
      }
      throw new Error(`Flexiele API error: ${response.status} ${response.statusText}`);
    }

    const body = await response.json();
    return decryptResponse(body as Record<string, string>);
  }

  private async requestUnencrypted(path: string): Promise<unknown> {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Cookie: `fe_session_id=${encodeURIComponent(this.sessionId)}`,
      Accept: "application/json",
      Origin: "https://feexotel.flexiele.com",
      Referer: "https://feexotel.flexiele.com/",
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Flexiele session expired (${response.status}). Refresh in 2 steps:\n` +
          `  1. Browser Console on feexotel.flexiele.com:\n` +
          `     fetch('https://raw.githubusercontent.com/shivanand-arch/flexiele-mcp/main/get-sessionid.js').then(r=>r.text()).then(eval)\n` +
          `  2. Terminal:\n` +
          `     bash ~/flexiele-mcp/refresh-session.sh`
        );
      }
      throw new Error(`Flexiele API error: ${response.status} ${response.statusText}`);
    }

    const body = await response.json();
    // userInfo response may also be encrypted
    try {
      return decryptResponse(body as Record<string, string>);
    } catch {
      // If decryption fails, return raw body
      return body;
    }
  }

  async getOrgData(curRootId: string = "0"): Promise<OrgDataResponse> {
    const result = await this.request(
      "/api/cng/chartAndGraph/getOrgData",
      { curRootId }
    );
    return result as OrgDataResponse;
  }

  async getUserInfo(): Promise<UserInfoResponse> {
    const result = await this.requestUnencrypted(
      "/api/default/home/userInfo"
    );
    return result as UserInfoResponse;
  }

  // Utility: flatten org tree into a list of employees
  flattenOrgTree(node: OrgNode | undefined): OrgNode[] {
    if (!node) return [];
    const result: OrgNode[] = [node];
    if (node.children) {
      for (const child of node.children) {
        result.push(...this.flattenOrgTree(child));
      }
    }
    return result;
  }

  // Utility: find an employee in the org tree by empId
  findInTree(
    node: OrgNode | undefined,
    empId: string
  ): OrgNode | undefined {
    if (!node) return undefined;
    if (String(node.empId) === String(empId)) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this.findInTree(child, empId);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Utility: search employees by name (case-insensitive partial match)
  searchByName(employees: OrgNode[], query: string): OrgNode[] {
    const lowerQuery = query.toLowerCase();
    return employees.filter(
      (emp) => emp.name && emp.name.toLowerCase().includes(lowerQuery)
    );
  }

  // Utility: build manager chain from the flat list
  buildManagerChain(
    employees: OrgNode[],
    empId: string
  ): string[] {
    const chain: string[] = [];
    const empMap = new Map<string, OrgNode>();
    for (const emp of employees) {
      empMap.set(String(emp.empId), emp);
    }

    let currentId: string | undefined = String(empId);
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const emp = empMap.get(currentId);
      if (!emp || !emp.mgrId || String(emp.mgrId) === "0" || String(emp.mgrId) === "") break;
      const mgr = empMap.get(String(emp.mgrId));
      if (mgr) {
        chain.push(`${mgr.name} (${mgr.empId})`);
        currentId = String(mgr.empId);
      } else {
        break;
      }
    }

    return chain;
  }

  // Utility: compute org stats from flat employee list
  computeOrgStats(
    employees: OrgNode[]
  ): {
    totalHeadcount: number;
    byUnit: Record<string, number>;
    byOffice: Record<string, number>;
    byPosition: Record<string, number>;
  } {
    const byUnit: Record<string, number> = {};
    const byOffice: Record<string, number> = {};
    const byPosition: Record<string, number> = {};

    for (const emp of employees) {
      const unitVal = emp.unit?.value || "Unknown";
      byUnit[unitVal] = (byUnit[unitVal] || 0) + 1;

      const office = emp.office || "Unknown";
      byOffice[office] = (byOffice[office] || 0) + 1;

      const position = emp.positionName || "Unknown";
      byPosition[position] = (byPosition[position] || 0) + 1;
    }

    return {
      totalHeadcount: employees.length,
      byUnit,
      byOffice,
      byPosition,
    };
  }
}
