import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FlexieleClient } from "./flexiele-client.js";
import type { EmployeeMatch } from "./types.js";

export function registerTools(server: McpServer, client: FlexieleClient): void {
  // Tool 1: get_org_tree
  server.tool(
    "get_org_tree",
    "Fetch the organizational hierarchy tree from Flexiele HRMS. Returns the full org chart or a subtree rooted at a specific employee.",
    {
      rootEmpId: z
        .string()
        .optional()
        .describe(
          'Employee ID to use as root of the subtree. Pass "0" or omit for the full org tree.'
        ),
    },
    async ({ rootEmpId }) => {
      try {
        const orgData = await client.getOrgData(rootEmpId || "0");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(orgData, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching org tree: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 2: get_employee_info
  server.tool(
    "get_employee_info",
    "Get the current authenticated user's employee information from Flexiele HRMS, including employee ID, name, email, and employee code.",
    {},
    async () => {
      try {
        const userInfo = await client.getUserInfo();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(userInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching employee info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 3: search_employee
  server.tool(
    "search_employee",
    "Search for employees by name in the Flexiele org tree. Returns matching employees with their position, unit, office, and manager chain.",
    {
      name: z.string().describe("Name (or partial name) to search for"),
    },
    async ({ name }) => {
      try {
        const orgData = await client.getOrgData("0");
        const allEmployees = client.flattenOrgTree(orgData.data?.downHirarchy);

        const matches = client.searchByName(allEmployees, name);

        const results: EmployeeMatch[] = matches.map((emp) => ({
          empId: emp.empId,
          name: emp.name,
          positionName: emp.positionName,
          unit: emp.unit,
          office: emp.office,
          mgrId: emp.mgrId,
          managerChain: client.buildManagerChain(allEmployees, String(emp.empId)),
        }));

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No employees found matching "${name}"`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching employees: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 4: get_direct_reports
  server.tool(
    "get_direct_reports",
    "Get the direct reports for a specific employee from the Flexiele org hierarchy.",
    {
      empId: z.string().describe("Employee ID to get direct reports for"),
    },
    async ({ empId }) => {
      try {
        const orgData = await client.getOrgData(empId);
        const rootNode = orgData.data?.downHirarchy;

        if (!rootNode || !rootNode.children || rootNode.children.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No direct reports found for employee ${empId}`,
              },
            ],
          };
        }

        const reports = rootNode.children.map((child) => ({
          empId: child.empId,
          name: child.name,
          positionName: child.positionName,
          unit: child.unit,
          office: child.office,
          hasReports: (child.children?.length ?? 0) > 0,
          reportCount: child.children?.length ?? 0,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  manager: {
                    empId: rootNode.empId,
                    name: rootNode.name,
                    positionName: rootNode.positionName,
                  },
                  directReports: reports,
                  totalDirectReports: reports.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching direct reports: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 5: get_reporting_chain
  server.tool(
    "get_reporting_chain",
    "Get the reporting chain (upward manager hierarchy) for an employee. You can search by employee ID or name.",
    {
      empId: z
        .string()
        .optional()
        .describe("Employee ID to trace the reporting chain for"),
      name: z
        .string()
        .optional()
        .describe(
          "Employee name to search for (used if empId not provided)"
        ),
    },
    async ({ empId, name }) => {
      try {
        if (!empId && !name) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Please provide either empId or name",
              },
            ],
            isError: true,
          };
        }

        const orgData = await client.getOrgData("0");
        const allEmployees = client.flattenOrgTree(orgData.data?.downHirarchy);

        let targetEmpId = empId;

        if (!targetEmpId && name) {
          const matches = client.searchByName(allEmployees, name);
          if (matches.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No employee found matching "${name}"`,
                },
              ],
            };
          }
          if (matches.length > 1) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Multiple employees match "${name}". Please specify empId:\n${JSON.stringify(
                    matches.map((m) => ({
                      empId: m.empId,
                      name: m.name,
                      positionName: m.positionName,
                    })),
                    null,
                    2
                  )}`,
                },
              ],
            };
          }
          targetEmpId = String(matches[0].empId);
        }

        const targetEmp = allEmployees.find(
          (e) => String(e.empId) === String(targetEmpId)
        );
        const chain = client.buildManagerChain(
          allEmployees,
          targetEmpId!
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  employee: targetEmp
                    ? {
                        empId: targetEmp.empId,
                        name: targetEmp.name,
                        positionName: targetEmp.positionName,
                      }
                    : { empId: targetEmpId },
                  reportingChain: chain,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching reporting chain: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 6: get_org_stats
  server.tool(
    "get_org_stats",
    "Get summary statistics for the organization from Flexiele HRMS, including total headcount and breakdowns by unit, office, and position.",
    {},
    async () => {
      try {
        const orgData = await client.getOrgData("0");
        const allEmployees = client.flattenOrgTree(orgData.data?.downHirarchy);
        const stats = client.computeOrgStats(allEmployees);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error computing org stats: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
