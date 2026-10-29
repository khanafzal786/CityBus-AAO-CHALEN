export const demoStops = [
  ["Polytechnic", 26.8704, 80.9954],
  ["Indira Nagar", 26.8803, 80.9915],
  ["Bhootnath Market", 26.8775, 80.9744],
  ["Lekhraj Market", 26.8685, 80.9656],
  ["Badshahnagar", 26.8712, 80.9562],
  ["IT College", 26.8749, 80.942],
  ["Hazratganj", 26.8507, 80.9462],
  ["Hussainganj", 26.8394, 80.9361],
  ["Charbagh Railway Station", 26.8312, 80.9234],
  ["Alambagh", 26.8121, 80.9068],
  ["Gomti Nagar", 26.8565, 81.01],
  ["Chinhat", 26.8788, 81.0269],
  ["Munshipulia", 26.9002, 80.9944],
  ["Airport", 26.7616, 80.8843],
  ["Aminabad", 26.846, 80.9237],
] as const;
export const demoRoutes = [
  ["CB101", "The everyday connection", [0, 2, 3, 4, 6, 7, 8], 38, 20],
  ["CB102", "Gomti connector", [11, 10, 0, 3, 6, 7, 8], 46, 25],
  ["CB103", "North city link", [12, 1, 2, 4, 5, 6], 32, 15],
  ["CB104", "Airport express", [8, 9, 13], 48, 45],
  ["CB105", "Market loop", [0, 2, 4, 5, 6, 14, 8], 42, 22],
  ["CB106", "City crosslink", [10, 6, 7, 8, 9], 40, 25],
] as const;
export async function seed(db: any) {
  if (await db.prepare("SELECT id FROM settings WHERE id='seed-v1'").first())
    return;
  const now = new Date().toISOString(),
    q: any[] = [];
  const add = (table: string, row: any) => {
    const ks = Object.keys(row);
    q.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO ${table} (${ks.join(",")}) VALUES (${ks.map(() => "?").join(",")})`,
        )
        .bind(...Object.values(row)),
    );
  };
  // No publicly known passwords. Demo sessions are gated by the runtime DEMO_MODE setting.
  add("users", {
    id: "demo-operator",
    fullName: "Demo Operator",
    email: "operator@example.test",
    phone: "",
    passwordHash: "DISABLED",
    role: "OPERATOR",
    createdAt: now,
    updatedAt: now,
  });
  add("operators", {
    id: "op-demo",
    userId: "demo-operator",
    companyName: "Lucknow Demo Fleet",
    ownerName: "Demo Operator",
    phone: "",
    email: "operator@example.test",
    city: "Lucknow",
    verificationStatus: "APPROVED",
    gpsAvailable: 0,
    totalBuses: 10,
    createdAt: now,
  });
  demoStops.forEach(([stopName, latitude, longitude], i) =>
    add("stops", {
      id: `s${i}`,
      stopName,
      latitude,
      longitude,
      city: "Lucknow",
      address: `${stopName}, Lucknow — illustrative stop`,
    }),
  );
  demoRoutes.forEach(
    ([routeCode, routeName, indices, estimatedDuration, baseFare], i) => {
      add("routes", {
        id: `r${i}`,
        routeCode,
        routeName,
        source: demoStops[indices[0]][0],
        destination: demoStops[indices[indices.length - 1]][0],
        estimatedDuration,
        baseFare,
        active: 1,
        createdAt: now,
      });
      add("operatorRoutes", {
        id: `or${i}`,
        operatorId: "op-demo",
        routeId: `r${i}`,
      });
      indices.forEach((s, j) =>
        add("routeStops", {
          id: `rs${i}-${j}`,
          routeId: `r${i}`,
          stopId: `s${s}`,
          stopOrder: j,
          estimatedOffsetMinutes: Math.round(
            (j * estimatedDuration) / (indices.length - 1),
          ),
        }),
      );
      indices.forEach((a, j) =>
        indices
          .slice(j + 1)
          .forEach((b, k) =>
            add("fares", {
              id: `f${i}-${a}-${b}`,
              routeId: `r${i}`,
              sourceStopId: `s${a}`,
              destinationStopId: `s${b}`,
              fareAmount: Math.max(
                10,
                Math.round((baseFare * (k + 1)) / (indices.length - 1)),
              ),
            }),
          ),
      );
    },
  );
  for (let i = 0; i < 10; i++) {
    const r = i % 6,
      s = demoStops[demoRoutes[r][2][0]];
    add("buses", {
      id: `b${i}`,
      operatorId: "op-demo",
      busNumber: `CB-${101 + i}`,
      registrationNumber: `DEMO-${1001 + i}`,
      routeId: `r${r}`,
      capacity: 40,
      type: i % 3 ? "AC" : "NON_AC",
      status: i === 9 ? "MAINTENANCE" : "ON_ROUTE",
      currentLatitude: s[1],
      currentLongitude: s[2],
      lastLocationUpdate: now,
      locationMode: "DEMO",
      createdAt: now,
    });
  }
  add("serviceAlerts", {
    id: "a1",
    title: "A little extra time near Hazratganj",
    description:
      "Demo advisory: allow an additional 5 minutes on CB101. This is illustrative service information.",
    severity: "INFO",
    routeId: "r0",
    active: 1,
    startsAt: now,
  });
  add("serviceAlerts", {
    id: "a2",
    title: "Welcome to your CITYBUS preview",
    description:
      "All routes, fares, vehicles and arrival estimates are demonstration data.",
    severity: "INFO",
    active: 1,
    startsAt: now,
  });
  [
    ["p1", "Day Explorer", "DAILY", 1, 79],
    ["p2", "Student Pass", "STUDENT", 30, 499],
    ["p3", "Monthly Commuter", "MONTHLY", 30, 899],
  ].forEach(([id, name, type, duration, price]) =>
    add("passes", { id, name, type, duration, price, active: 1 }),
  );
  add("settings", { id: "seed-v1", value: now });
  await db.batch(q);
}
