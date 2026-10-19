import { Fragment, useEffect, useId, useRef, useState } from "react";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "../../domain/lead";
import { nextInterview } from "../../domain/lifecycle";
import { type LeadSort, queryLeads } from "../../domain/overview";
import type { Project } from "../../domain/project";
import { focusOnMount } from "../focus";
import { useMessages } from "../i18n";
import { Link } from "../router";
import { useApp, useSnapshot } from "../state";
import { localNow } from "../time";

// Lead overview of a project (FR-036) and deleting a lead (FR-037).

export function LeadList({ project }: { project: Project }) {
  const m = useMessages();
  const snapshot = useSnapshot();
  const { commit, busy } = useApp();
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [sort, setSort] = useState<LeadSort>("activity");
  const [deleting, setDeleting] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  const deleteButtons = useRef(new Map<string, HTMLButtonElement>());
  const filterId = useId();
  const sortId = useId();

  const all = snapshot.leads.filter((lead) => lead.projectId === project.id);
  const now = localNow();
  const leads = queryLeads(all, { ...(status ? { status } : {}), sort }, now);
  const columns = m.leads.columns;

  // After a cancelled delete, focus returns to the row's button once it is
  // enabled again (after the re-render).
  const returnFocus = useRef<string>(undefined);
  useEffect(() => {
    if (deleting !== undefined || !returnFocus.current) return;
    deleteButtons.current.get(returnFocus.current)?.focus();
    returnFocus.current = undefined;
  }, [deleting]);

  function cancelDelete(id: string) {
    returnFocus.current = id;
    setDeleting(undefined);
  }

  async function remove(lead: Lead) {
    const ok = await commit(
      (store) => store.deleteLead(lead.id),
      (s) => ({ ...s, leads: s.leads.filter((l) => l.id !== lead.id) }),
      m.leads.deleted(lead.company.name),
    );
    if (ok) {
      setDeleting(undefined);
      heading.current?.focus();
    }
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>
        {m.leads.heading}
      </h1>
      {all.length === 0 ? (
        <p>{m.leads.empty}</p>
      ) : (
        <>
          <div className="filter-bar">
            <div className="field">
              <label htmlFor={filterId}>{m.leads.filterLabel}</label>
              <select
                id={filterId}
                value={status}
                onChange={(event) =>
                  setStatus(
                    LEAD_STATUSES.find((s) => s === event.target.value) ?? "",
                  )
                }
              >
                <option value="">{m.leads.filterAll}</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {m.leads.status[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={sortId}>{m.leads.sortLabel}</label>
              <select
                id={sortId}
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value === "next" ? "next" : "activity")
                }
              >
                <option value="activity">{m.leads.sortActivity}</option>
                <option value="next">{m.leads.sortNext}</option>
              </select>
            </div>
          </div>
          <p aria-live="polite">{m.leads.shown(leads.length, all.length)}</p>
          {leads.length === 0 ? (
            <p>{m.leads.filteredEmpty}</p>
          ) : (
            <table className="lead-table">
              <thead>
                <tr>
                  <th scope="col">{columns.company}</th>
                  <th scope="col">{columns.position}</th>
                  <th scope="col">{columns.status}</th>
                  <th scope="col">{columns.next}</th>
                  <th scope="col">{columns.activity}</th>
                  <th scope="col">{columns.actions}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const next = nextInterview(lead, now);
                  return (
                    <Fragment key={lead.id}>
                      <tr>
                        <td data-label={columns.company}>
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
                        <td data-label={columns.position}>
                          {lead.position.title}
                        </td>
                        <td data-label={columns.status}>
                          {m.leads.status[lead.status]}
                        </td>
                        <td data-label={columns.next}>
                          {next
                            ? m.format.dateTime(next.dateTime)
                            : m.leads.none}
                        </td>
                        <td data-label={columns.activity}>
                          {m.format.timestamp(lead.updatedAt)}
                        </td>
                        <td data-label={columns.actions}>
                          <button
                            type="button"
                            className="secondary small"
                            disabled={busy || deleting !== undefined}
                            aria-label={m.leads.deleteLabel(lead.company.name)}
                            ref={(element) => {
                              if (element) {
                                deleteButtons.current.set(lead.id, element);
                              } else {
                                deleteButtons.current.delete(lead.id);
                              }
                            }}
                            onClick={() => setDeleting(lead.id)}
                          >
                            {m.common.delete}
                          </button>
                        </td>
                      </tr>
                      {deleting === lead.id && (
                        <tr className="confirm-row">
                          <td colSpan={6}>
                            <div className="confirm" role="alert">
                              <p>
                                {m.leads.deletePrompt(
                                  lead.company.name,
                                  lead.comments.length,
                                  Boolean(lead.coverLetterPdf),
                                )}
                              </p>
                              <div className="actions">
                                <button
                                  type="button"
                                  className="danger"
                                  disabled={busy}
                                  onClick={() => void remove(lead)}
                                >
                                  {m.leads.deleteConfirm}
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  // The row's own button is disabled now.
                                  ref={focusOnMount}
                                  onClick={() => cancelDelete(lead.id)}
                                >
                                  {m.common.cancel}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );
}
