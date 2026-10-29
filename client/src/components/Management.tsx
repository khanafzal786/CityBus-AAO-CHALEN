"use client";
import { useEffect, useState } from "react";
import { api } from "../api";
import Form, { Field } from "./Form";
const options = (s: string[]) =>
  s.map((value) => ({ value, label: value.replaceAll("_", " ") }));
export default function Management({
  role,
  notify,
}: {
  role: string;
  notify: (s: string) => void;
}) {
  const admin = role === "ADMIN",
    base = admin ? "admin" : "operator";
  const tabs = admin
    ? [
        "Overview",
        "Buses",
        "Routes",
        "Stops",
        "Fares",
        "Alerts",
        "Passes",
        "Applications",
        "Operators",
        "Users",
        "Contact",
        "Permissions",
      ]
    : ["Overview", "Buses", "Routes", "Alerts"];
  const [tab, setTab] = useState("Overview"),
    [rows, setRows] = useState<any[]>([]),
    [overview, setOverview] = useState<any>(null),
    [editing, setEditing] = useState<any>(null),
    [sequence, setSequence] = useState<any>(null),
    [sequenceText, setSequenceText] = useState(""),
    [lookups, setLookups] = useState<any>({
      routes: [],
      stops: [],
      operators: [],
      buses: [],
    }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    setError("");
    return api(base + "/" + tab.toLowerCase())
      .then((d) => {
        tab === "Overview" ? setOverview(d) : setRows(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    setEditing(null);
    setSequence(null);
  }, [tab]);
  useEffect(() => {
    Promise.all([
      api("routes"),
      api("stops"),
      admin ? api("admin/operators") : api("operator/overview"),
      api("buses"),
    ])
      .then(([routes, stops, ops, buses]) =>
        setLookups({
          routes,
          stops,
          operators: admin ? ops : ops.operator ? [ops.operator] : [],
          buses,
        }),
      )
      .catch((e) => setError(e.message));
  }, [tab]);
  const refs = (key: string, label: string) =>
    lookups[key].map((r: any) => ({ value: r.id, label: r[label] }));
  const field = (
    name: string,
    label: string,
    type?: string,
    opts?: any,
  ): Field => ({ name, label, type, options: opts });
  const schemas: Record<string, Field[]> = {
    Buses: [
      ...(admin
        ? [
            field(
              "operatorId",
              "Operator",
              undefined,
              refs("operators", "companyName"),
            ),
          ]
        : []),
      field("busNumber", "Bus number"),
      field("registrationNumber", "Registration number"),
      field(
        "routeId",
        "Assigned route",
        undefined,
        refs("routes", "routeCode"),
      ),
      field("capacity", "Seats", "number"),
      field(
        "type",
        "Vehicle type",
        undefined,
        options(["AC", "NON_AC", "ELECTRIC"]),
      ),
      field(
        "status",
        "Service status",
        undefined,
        options(["ON_ROUTE", "ACTIVE", "DELAYED", "INACTIVE", "MAINTENANCE"]),
      ),
    ],
    Routes: [
      field("routeCode", "Route code"),
      field("routeName", "Route name"),
      field("source", "Origin name"),
      field("destination", "Destination name"),
      field("estimatedDuration", "Duration (minutes)", "number"),
      field("baseFare", "Base fare (₹)", "number"),
      field("active", "Availability", undefined, [
        { value: "1", label: "Active" },
        { value: "0", label: "Disabled" },
      ]),
    ],
    Stops: [
      field("stopName", "Stop name"),
      { ...field("latitude", "Latitude", "number"), step: "any" },
      { ...field("longitude", "Longitude", "number"), step: "any" },
      field("city", "City"),
      field("address", "Address"),
      field("active", "Availability", undefined, [
        { value: "1", label: "Active" },
        { value: "0", label: "Disabled" },
      ]),
    ],
    Fares: [
      field("routeId", "Route", undefined, refs("routes", "routeCode")),
      field("sourceStopId", "From stop", undefined, refs("stops", "stopName")),
      field(
        "destinationStopId",
        "To stop",
        undefined,
        refs("stops", "stopName"),
      ),
      field("fareAmount", "Fare (₹)", "number"),
    ],
    Alerts: [
      field("title", "Title"),
      field("description", "Description", "textarea"),
      field(
        "severity",
        "Severity",
        undefined,
        options(["INFO", "WARNING", "CRITICAL"]),
      ),
      field(
        "routeId",
        "Route",
        undefined,
        admin
          ? [{ value: "", label: "All routes" }, ...refs("routes", "routeCode")]
          : refs("routes", "routeCode"),
      ),
      field("busId", "Bus (optional)", undefined, [
        { value: "", label: "No specific bus" },
        ...refs("buses", "busNumber"),
      ]),
      {
        name: "startsAt",
        label: "Starts at (UTC ISO timestamp)",
        required: false,
      },
      { name: "endsAt", label: "Ends at (UTC ISO timestamp)", required: false },
      field("active", "Visibility", undefined, [
        { value: "1", label: "Visible" },
        { value: "0", label: "Disabled" },
      ]),
    ],
    Passes: [
      field("name", "Plan name"),
      field(
        "type",
        "Pass type",
        undefined,
        options(["DAILY", "STUDENT", "MONTHLY"]),
      ),
      field("duration", "Duration (days)", "number"),
      field("price", "Indicative price (₹)", "number"),
      field("active", "Visibility", undefined, [
        { value: "1", label: "Visible" },
        { value: "0", label: "Disabled" },
      ]),
    ],
  };
  async function action(path: string, data: any, method = "PATCH") {
    try {
      await api(base + "/" + path, method, data);
      notify("Changes saved.");
      load();
    } catch (e: any) {
      notify(e.message);
    }
  }
  const columns: Record<string, string[]> = {
    Buses: [
      "busNumber",
      "registrationNumber",
      "capacity",
      "type",
      "status",
      "lastLocationUpdate",
    ],
    Routes: [
      "routeCode",
      "routeName",
      "source",
      "destination",
      "baseFare",
      "active",
    ],
    Stops: ["stopName", "city", "latitude", "longitude", "active"],
    Fares: ["routeId", "sourceStopId", "destinationStopId", "fareAmount"],
    Alerts: ["title", "description", "severity", "active"],
    Passes: ["name", "type", "duration", "price", "active"],
    Applications: [
      "companyName",
      "contactPerson",
      "email",
      "phone",
      "numberOfBuses",
      "currentRoutes",
      "message",
      "status",
    ],
    Operators: ["companyName", "email", "city", "verificationStatus"],
    Users: ["fullName", "email", "role", "disabled"],
    Contact: ["name", "email", "subject", "message", "status"],
    Permissions: ["operatorId", "routeId"],
  };
  const human = (s: string) =>
    s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  const value = (key: string, v: any) => {
    if (key === "routeId")
      return lookups.routes.find((x: any) => x.id === v)?.routeCode || v;
    if (key === "operatorId")
      return lookups.operators.find((x: any) => x.id === v)?.companyName || v;
    if (key.endsWith("StopId"))
      return lookups.stops.find((x: any) => x.id === v)?.stopName || v;
    if (key === "active") return v ? "Active" : "Disabled";
    if (key === "disabled") return v ? "Disabled" : "Enabled";
    if (key === "lastLocationUpdate")
      return v ? new Date(v).toLocaleString() : "No GPS update";
    return String(v ?? "—");
  };
  return (
    <div className="management">
      <aside className="dash-nav">
        <div className="eyebrow">
          {admin ? "CONTROL CENTRE" : "FLEET WORKSPACE"}
        </div>
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            <span>↗</span>
          </button>
        ))}
      </aside>
      <section className="dash-content">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CITYBUS / {base.toUpperCase()}</span>
            <h2>{tab}</h2>
          </div>
          {schemas[tab] && (admin || tab !== "Routes") && (
            <button className="btn primary" onClick={() => setEditing({})}>
              + Add {tab === "Buses" ? "bus" : tab.slice(0, -1).toLowerCase()}
            </button>
          )}
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
            <button onClick={load}>Retry</button>
          </div>
        )}
        {loading ? (
          <div className="skeleton">Loading workspace…</div>
        ) : tab === "Overview" ? (
          <>
            <div className="metric-grid">
              {Object.entries(
                admin
                  ? overview || {}
                  : {
                      "Total buses": overview?.buses.length || 0,
                      "Active buses":
                        overview?.buses.filter((b: any) =>
                          ["ACTIVE", "ON_ROUTE", "DELAYED"].includes(b.status),
                        ).length || 0,
                      "Assigned routes": overview?.routes.length || 0,
                    },
              ).map(([k, v]) => (
                <div className="metric" key={k}>
                  <span>{human(k)}</span>
                  <strong>{String(v)}</strong>
                </div>
              ))}
            </div>
            <div className="panel">
              <h3>Ready for the next journey.</h3>
              <p>
                Manage your{" "}
                {admin
                  ? "network, applications and users"
                  : "fleet, assigned routes and service alerts"}{" "}
                from the menu. All changes are saved to the database.
              </p>
              <p className="muted">
                Prototype fleet · no commercial operations are represented.
              </p>
              {!admin &&
                overview?.activity?.map((a: any) => (
                  <p key={a.id}>
                    {a.action}{" "}
                    <small>{new Date(a.createdAt).toLocaleString()}</small>
                  </p>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(columns[tab] || []).map((k) => (
                      <th key={k}>{human(k)}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {(columns[tab] || []).map((k) => (
                        <td key={k}>{value(k, row[k])}</td>
                      ))}
                      <td className="actions-cell">
                        {schemas[tab] && (
                          <button
                            className="text-btn"
                            onClick={() => setEditing(row)}
                          >
                            Edit
                          </button>
                        )}
                        {tab === "Routes" && (
                          <button
                            className="text-btn"
                            onClick={async () => {
                              try {
                                const s = await api(
                                  base + "/routes/" + row.id + "/stops",
                                );
                                setSequence(row);
                                setSequenceText(
                                  s
                                    .map(
                                      (s: any) =>
                                        s.id + "," + s.estimatedOffsetMinutes,
                                    )
                                    .join("\n"),
                                );
                              } catch (e: any) {
                                notify(e.message);
                              }
                            }}
                          >
                            Stop sequence
                          </button>
                        )}
                        {admin && schemas[tab] && (
                          <button
                            className="text-btn danger"
                            onClick={() => {
                              if (confirm("Disable this record?"))
                                action(
                                  tab.toLowerCase() + "/" + row.id,
                                  {},
                                  "DELETE",
                                );
                            }}
                          >
                            {tab === "Fares" ? "Delete" : "Disable"}
                          </button>
                        )}
                        {tab === "Buses" && (
                          <button
                            className="text-btn"
                            onClick={async () => {
                              try {
                                await api(
                                  "buses/" + row.id + "/simulate",
                                  "POST",
                                  {},
                                );
                                notify("Demo simulation enabled.");
                                load();
                              } catch (e: any) {
                                notify(e.message);
                              }
                            }}
                          >
                            Simulate GPS
                          </button>
                        )}
                        {tab === "Applications" && row.status === "PENDING" && (
                          <>
                            <button
                              className="text-btn"
                              onClick={() =>
                                action("applications/" + row.id, {
                                  status: "APPROVED",
                                })
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="text-btn danger"
                              onClick={() =>
                                action("applications/" + row.id, {
                                  status: "REJECTED",
                                })
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {tab === "Operators" && (
                          <button
                            className="text-btn"
                            onClick={() =>
                              action("operators/" + row.id, {
                                verificationStatus:
                                  row.verificationStatus === "SUSPENDED"
                                    ? "APPROVED"
                                    : "SUSPENDED",
                              })
                            }
                          >
                            {row.verificationStatus === "SUSPENDED"
                              ? "Restore"
                              : "Suspend"}
                          </button>
                        )}
                        {tab === "Users" && (
                          <>
                            <button
                              className="text-btn"
                              onClick={() =>
                                action("users/" + row.id, {
                                  disabled: row.disabled ? 0 : 1,
                                })
                              }
                            >
                              {row.disabled ? "Enable" : "Disable"}
                            </button>
                            <select
                              aria-label={"Role for " + row.fullName}
                              value={row.role}
                              onChange={(e) => {
                                if (
                                  confirm(
                                    "Confirm changing this account to " +
                                      e.target.value +
                                      "?",
                                  )
                                )
                                  action("users/" + row.id, {
                                    role: e.target.value,
                                    confirmRole: true,
                                  });
                              }}
                            >
                              {["PASSENGER", "OPERATOR", "ADMIN"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </>
                        )}
                        {tab === "Contact" && (
                          <select
                            aria-label="Message status"
                            value={row.status}
                            onChange={(e) =>
                              action("contact/" + row.id, {
                                status: e.target.value,
                              })
                            }
                          >
                            {["NEW", "IN_PROGRESS", "RESOLVED"].map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        )}
                        {tab === "Permissions" && (
                          <button
                            className="text-btn danger"
                            onClick={() =>
                              action(
                                "permissions",
                                {
                                  operatorId: row.operatorId,
                                  routeId: row.routeId,
                                },
                                "DELETE",
                              )
                            }
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className="empty">
                  Nothing here yet. New records will appear here.
                </div>
              )}
            </div>
            {tab === "Permissions" && (
              <div className="panel">
                <h3>Assign an operator to a route</h3>
                <Form
                  fields={[
                    field(
                      "operatorId",
                      "Operator",
                      undefined,
                      refs("operators", "companyName"),
                    ),
                    field(
                      "routeId",
                      "Route",
                      undefined,
                      refs("routes", "routeCode"),
                    ),
                  ]}
                  submit={(d) => api("admin/permissions", "POST", d)}
                  onDone={load}
                  label="Grant route access"
                />
              </div>
            )}
          </>
        )}
        {editing && (
          <div className="editor panel">
            <div className="section-heading">
              <h3>
                {editing.id ? "Edit" : "New"} {tab.toLowerCase()}
              </h3>
              <button className="text-btn" onClick={() => setEditing(null)}>
                Close ×
              </button>
            </div>
            <Form
              key={editing.id || "new"}
              fields={schemas[tab]}
              initial={editing}
              submit={(d) => {
                if (tab === "Alerts") {
                  d.routeId = d.routeId || null;
                  d.busId = d.busId || null;
                  d.startsAt = d.startsAt || new Date().toISOString();
                  d.endsAt = d.endsAt || null;
                }
                return api(
                  base +
                    "/" +
                    tab.toLowerCase() +
                    (editing.id ? "/" + editing.id : ""),
                  editing.id ? "PATCH" : "POST",
                  d,
                );
              }}
              onDone={() => {
                setEditing(null);
                load();
                notify("Record saved.");
              }}
            />
          </div>
        )}
        {sequence && (
          <div className="panel">
            <div className="section-heading">
              <h3>Stops for {sequence.routeCode}</h3>
              <button className="text-btn" onClick={() => setSequence(null)}>
                Close ×
              </button>
            </div>
            <p>
              One stop ID and time offset per line, in travel order (example:
              s0,0). Saving replaces the sequence and clears old segment fares;
              add updated fares afterwards.
            </p>
            <div className="stop-reference">
              {lookups.stops.map((s: any) => (
                <span key={s.id}>
                  {s.id} = {s.stopName}
                </span>
              ))}
            </div>
            <label>
              Ordered stops
              <textarea
                value={sequenceText}
                onChange={(e) => setSequenceText(e.target.value)}
                rows={8}
              />
            </label>
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  const d = sequenceText
                    .trim()
                    .split("\n")
                    .map((l) => {
                      const [stopId, m] = l.split(",");
                      return {
                        stopId: stopId.trim(),
                        estimatedOffsetMinutes: Number(m),
                      };
                    });
                  await api(
                    base + "/routes/" + sequence.id + "/stops",
                    "PUT",
                    d,
                  );
                  setSequence(null);
                  load();
                  notify("Stop sequence saved.");
                } catch (e: any) {
                  notify(e.message);
                }
              }}
            >
              Save sequence
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
