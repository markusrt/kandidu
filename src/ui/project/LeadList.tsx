import type { Project } from "../../domain/project";
import { useMessages } from "../i18n";
import { Link } from "../router";
import { useSnapshot } from "../state";

export function LeadList({ project }: { project: Project }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const leads = snapshot.leads
    .filter((lead) => lead.projectId === project.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <>
      <h1>{m.leads.heading}</h1>
      {leads.length === 0 ? (
        <p>{m.leads.empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{m.leads.columnCompany}</th>
                <th scope="col">{m.leads.columnPosition}</th>
                <th scope="col">{m.leads.columnStatus}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link
                      to={{
                        name: "lead",
                        projectId: project.id,
                        leadId: lead.id,
                        step: "pruefen",
                      }}
                    >
                      {lead.company.name}
                    </Link>
                  </td>
                  <td>{lead.position.title}</td>
                  <td>{m.leads.status[lead.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
