import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text().primaryKey(),
  fullName: text().notNull(),
  email: text().notNull().unique(),
  phone: text().notNull().default(""),
  passwordHash: text().notNull(),
  role: text().notNull().default("PASSENGER"),
  profilePhoto: text(),
  disabled: integer().notNull().default(0),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
});
export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id),
  expiresAt: integer().notNull(),
});
export const operators = sqliteTable("operators", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .unique()
    .references(() => users.id),
  companyName: text().notNull(),
  ownerName: text().notNull(),
  phone: text().notNull(),
  email: text().notNull(),
  city: text().notNull(),
  address: text().notNull().default(""),
  verificationStatus: text().notNull().default("PENDING"),
  gpsAvailable: integer().notNull().default(0),
  totalBuses: integer().notNull().default(0),
  createdAt: text().notNull(),
});
export const routes = sqliteTable("routes", {
  id: text().primaryKey(),
  routeCode: text().notNull().unique(),
  routeName: text().notNull(),
  source: text().notNull(),
  destination: text().notNull(),
  estimatedDuration: integer().notNull(),
  baseFare: real().notNull(),
  active: integer().notNull().default(1),
  createdAt: text().notNull(),
});
export const stops = sqliteTable("stops", {
  id: text().primaryKey(),
  stopName: text().notNull(),
  latitude: real().notNull(),
  longitude: real().notNull(),
  city: text().notNull(),
  address: text().notNull().default(""),
  active: integer().notNull().default(1),
});
export const routeStops = sqliteTable(
  "routeStops",
  {
    id: text().primaryKey(),
    routeId: text()
      .notNull()
      .references(() => routes.id),
    stopId: text()
      .notNull()
      .references(() => stops.id),
    stopOrder: integer().notNull(),
    estimatedOffsetMinutes: integer().notNull(),
  },
  (t) => [
    uniqueIndex("route_stop_unique").on(t.routeId, t.stopId),
    uniqueIndex("route_order_unique").on(t.routeId, t.stopOrder),
  ],
);
export const operatorRoutes = sqliteTable(
  "operatorRoutes",
  {
    id: text().primaryKey(),
    operatorId: text()
      .notNull()
      .references(() => operators.id),
    routeId: text()
      .notNull()
      .references(() => routes.id),
  },
  (t) => [uniqueIndex("operator_route_unique").on(t.operatorId, t.routeId)],
);
export const buses = sqliteTable("buses", {
  id: text().primaryKey(),
  operatorId: text()
    .notNull()
    .references(() => operators.id),
  busNumber: text().notNull().unique(),
  registrationNumber: text().notNull().unique(),
  routeId: text().references(() => routes.id),
  capacity: integer().notNull(),
  type: text().notNull(),
  status: text().notNull(),
  currentLatitude: real(),
  currentLongitude: real(),
  lastLocationUpdate: text(),
  locationMode: text().notNull().default("DEMO"),
  createdAt: text().notNull(),
});
export const busLocations = sqliteTable("busLocations", {
  id: text().primaryKey(),
  busId: text()
    .notNull()
    .references(() => buses.id),
  latitude: real().notNull(),
  longitude: real().notNull(),
  speed: real().notNull(),
  timestamp: text().notNull(),
  mode: text().notNull(),
});
export const fares = sqliteTable(
  "fares",
  {
    id: text().primaryKey(),
    routeId: text()
      .notNull()
      .references(() => routes.id),
    sourceStopId: text()
      .notNull()
      .references(() => stops.id),
    destinationStopId: text()
      .notNull()
      .references(() => stops.id),
    fareAmount: real().notNull(),
  },
  (t) => [
    uniqueIndex("fare_pair_unique").on(
      t.routeId,
      t.sourceStopId,
      t.destinationStopId,
    ),
  ],
);
export const serviceAlerts = sqliteTable("serviceAlerts", {
  id: text().primaryKey(),
  title: text().notNull(),
  description: text().notNull(),
  severity: text().notNull(),
  routeId: text().references(() => routes.id),
  busId: text().references(() => buses.id),
  active: integer().notNull().default(1),
  startsAt: text().notNull(),
  endsAt: text(),
});
export const favouriteRoutes = sqliteTable(
  "favouriteRoutes",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id),
    routeId: text()
      .notNull()
      .references(() => routes.id),
  },
  (t) => [uniqueIndex("fav_route_unique").on(t.userId, t.routeId)],
);
export const favouriteStops = sqliteTable(
  "favouriteStops",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id),
    stopId: text()
      .notNull()
      .references(() => stops.id),
  },
  (t) => [uniqueIndex("fav_stop_unique").on(t.userId, t.stopId)],
);
export const journeys = sqliteTable("journeys", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id),
  source: text().notNull(),
  destination: text().notNull(),
  routeId: text().references(() => routes.id),
  searchedAt: text().notNull(),
});
export const savedPlaces = sqliteTable("savedPlaces", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id),
  label: text().notNull(),
  stopId: text()
    .notNull()
    .references(() => stops.id),
});
export const contactMessages = sqliteTable("contactMessages", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  phone: text().notNull(),
  subject: text().notNull(),
  message: text().notNull(),
  status: text().notNull().default("NEW"),
  createdAt: text().notNull(),
});
export const operatorApplications = sqliteTable("operatorApplications", {
  id: text().primaryKey(),
  companyName: text().notNull(),
  contactPerson: text().notNull(),
  email: text().notNull(),
  phone: text().notNull(),
  city: text().notNull(),
  numberOfBuses: integer().notNull(),
  currentRoutes: text().notNull(),
  gpsAvailable: integer().notNull(),
  message: text().notNull(),
  status: text().notNull().default("PENDING"),
  createdAt: text().notNull(),
});
export const passes = sqliteTable("passes", {
  id: text().primaryKey(),
  name: text().notNull(),
  type: text().notNull(),
  duration: integer().notNull(),
  price: real().notNull(),
  active: integer().notNull().default(1),
});
export const wallets = sqliteTable("wallets", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .unique()
    .references(() => users.id),
  balance: integer().notNull().default(0),
  status: text().notNull().default("COMING_SOON"),
});
export const walletTransactions = sqliteTable("walletTransactions", {
  id: text().primaryKey(),
  walletId: text()
    .notNull()
    .references(() => wallets.id),
  amount: integer().notNull(),
  type: text().notNull(),
  description: text().notNull(),
  createdAt: text().notNull(),
});
export const rateLimits = sqliteTable("rateLimits", {
  id: text().primaryKey(),
  count: integer().notNull(),
  expiresAt: integer().notNull(),
});
export const settings = sqliteTable("settings", {
  id: text().primaryKey(),
  value: text().notNull(),
});
export const auditLog = sqliteTable("auditLog", {
  id: text().primaryKey(),
  userId: text().notNull(),
  action: text().notNull(),
  createdAt: text().notNull(),
});
export const resetTokens = sqliteTable("resetTokens", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id),
  expiresAt: integer().notNull(),
  used: integer().notNull().default(0),
});
