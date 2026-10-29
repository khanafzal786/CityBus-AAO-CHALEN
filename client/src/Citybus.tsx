"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  MapPin,
  Navigation,
  BusFront,
  Route,
  Clock,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Heart,
  Menu,
  X,
  Search,
  User,
  House,
  Ticket,
  LocateFixed,
  Check,
  Leaf,
  Building2,
} from "lucide-react";
import { api } from "./api";
import Form from "./components/Form";
import RouteMap from "./components/RouteMap";
import Management from "./components/Management";
const go = (path: string) => {
  window.location.hash = "/" + path;
  window.scrollTo({ top: 0, behavior: "smooth" });
};
const money = (n: number) => "₹" + n;
const nav = [
  ["Home", "home"],
  ["Find Bus", "search"],
  ["Routes", "routes"],
  ["Live Map", "map"],
  ["Stops", "stops"],
  ["Passes", "passes"],
];
export default function Citybus() {
  const [page, setPage] = useState("home"),
    [param, setParam] = useState(""),
    [menu, setMenu] = useState(false),
    [user, setUser] = useState<any>(null),
    [demo, setDemo] = useState(false),
    [stops, setStops] = useState<any[]>([]),
    [routes, setRoutes] = useState<any[]>([]),
    [alerts, setAlerts] = useState<any[]>([]),
    [buses, setBuses] = useState<any[]>([]),
    [plans, setPlans] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [from, setFrom] = useState("s0"),
    [to, setTo] = useState("s8"),
    [results, setResults] = useState<any[] | null>(null),
    [searching, setSearching] = useState(false),
    [sort, setSort] = useState("earliest"),
    [query, setQuery] = useState(""),
    [detail, setDetail] = useState<any>(null),
    [detailError, setDetailError] = useState(""),
    [selectedBus, setSelectedBus] = useState("b0"),
    [nearby, setNearby] = useState<any[] | null>(null),
    [geo, setGeo] = useState<any>(null),
    [locationMessage, setLocationMessage] = useState(""),
    [account, setAccount] = useState<any>(null),
    [register, setRegister] = useState(false);
  const notify = (s: string) => setToast(s);
  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      api("auth/me"),
      api("stops"),
      api("routes"),
      api("alerts"),
      api("buses"),
      api("passes"),
    ])
      .then(([auth, stops, routes, alerts, buses, plans]) => {
        setUser(auth.user);
        setDemo(auth.demo);
        setStops(stops);
        setRoutes(routes);
        setAlerts(alerts);
        setBuses(buses);
        setPlans(plans);
        if (buses.length && !buses.some((b: any) => b.id === selectedBus))
          setSelectedBus(buses[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const onHash = () => {
      const [p = "home", id = ""] = window.location.hash
        .replace(/^#\/?/, "")
        .split("/");
      setPage(p || "home");
      setParam(id);
      setMenu(false);
      setQuery("");
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    load();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (page === "route" && param) {
      setDetail(null);
      setDetailError("");
      api("routes/" + param)
        .then(setDetail)
        .catch((e) => setDetailError(e.message));
    }
    if (page === "account" && user)
      api("me")
        .then(setAccount)
        .catch((e) => notify(e.message));
    if (page === "map" && param) setSelectedBus(param);
  }, [page, param, user]);
  const refreshAccount = () =>
    api("me")
      .then(setAccount)
      .catch((e) => notify(e.message));
  const save = async (type: string, key: string) => {
    if (!user) {
      go("login");
      return;
    }
    try {
      await api(
        "me/" + type,
        "POST",
        type === "favouriteRoutes" ? { routeId: key } : { stopId: key },
      );
      notify("Saved to your favourites.");
      if (page === "account") refreshAccount();
    } catch (e: any) {
      notify(e.message);
    }
  };
  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (from === to) {
      notify("Choose two different stops.");
      return;
    }
    go("search");
    setSearching(true);
    setResults(null);
    try {
      setResults(
        await api(
          "journey/search?source=" +
            encodeURIComponent(from) +
            "&destination=" +
            encodeURIComponent(to),
        ),
      );
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSearching(false);
    }
  }
  const SearchForm = ({ hero = false }: { hero?: boolean }) => (
    <form
      className={"journey-search " + (hero ? "hero-search" : "")}
      onSubmit={search}
    >
      <label>
        <span className="field-title">
          <span className="route-circle" />
          FROM
        </span>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Departure stop"
        >
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.stopName}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="swap"
        aria-label="Swap departure and destination"
        onClick={() => {
          setFrom(to);
          setTo(from);
        }}
      >
        <ArrowLeftRight size={18} />
      </button>
      <label>
        <span className="field-title">
          <MapPin size={14} />
          TO
        </span>
        <select
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Destination stop"
        >
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.stopName}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn primary search-submit"
        disabled={searching || !stops.length}
      >
        {searching ? "Searching…" : "Find Buses"}
        <ArrowUpRight size={20} />
      </button>
    </form>
  );
  const AlertBanner = () =>
    alerts.length ? (
      <div className="service-banner">
        <span className="pill">SERVICE UPDATE</span>
        <span>{alerts[0].title}</span>
        <button onClick={() => go("alerts")}>
          View details <ChevronRight size={14} />
        </button>
      </div>
    ) : null;
  const RouteCard = ({ r }: { r: any }) => (
    <article className="route-card">
      <div className="card-top">
        <span className="route-code">
          <BusFront size={17} />
          {r.routeCode}
        </span>
        <button
          className="icon-btn"
          aria-label={"Save " + r.routeCode}
          onClick={() => save("favouriteRoutes", r.id)}
        >
          <Heart size={18} />
        </button>
      </div>
      <h3>
        {r.source} <span>→</span>
        <br />
        {r.destination}
      </h3>
      <div className="route-meta">
        <span>
          <Clock size={14} />
          {r.estimatedDuration} min
        </span>
        <span>
          <MapPin size={14} />
          {r.stopCount ?? "—"} stops
        </span>
      </div>
      <div className="card-bottom">
        <div>
          <strong>{money(r.baseFare)}</strong>
          <small>demo base fare</small>
        </div>
        <button
          className="round-arrow"
          aria-label={"View route " + r.routeCode}
          onClick={() => go("route/" + r.id)}
        >
          <ArrowUpRight size={20} />
        </button>
      </div>
    </article>
  );
  const heading = (tag: string, title: string, description?: string) => (
    <div className="page-heading">
      <span className="eyebrow">{tag}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
  const titleIcon = (Icon: any, title: string, body: string) => (
    <article className="feature-card">
      <span className="feature-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
  return (
    <>
      <div className="topline">
        <span>Made for everyday journeys. Built for Lucknow.</span>
        <span>
          <span className="dot" />
          Prototype / Demo Data
        </span>
      </div>
      <header className="header">
        <a className="brand" href="#/home" aria-label="CITYBUS home">
          <img
            src="/assets/brand/citybus-logo-transparent.png"
            alt="CITYBUS — AAO CHALEN"
          />
        </a>
        <nav className={menu ? "nav open" : "nav"} aria-label="Main navigation">
          {nav.map(([name, path]) => (
            <a
              key={path}
              href={"#/" + path}
              className={page === path ? "active" : ""}
            >
              {name}
            </a>
          ))}
        </nav>
        <div className="header-right">
          <a href="#/operators" className="operator-link">
            For Operators <ArrowUpRight size={14} />
          </a>
          <button
            className="btn outline compact"
            onClick={() => go(user ? "account" : "login")}
          >
            {user ? <User size={17} /> : null}
            {user ? "My account" : "Sign in"}
          </button>
          <button
            className="menu-btn icon-btn"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {loading ? (
        <main className="container">
          <div className="skeleton large">
            Preparing your CITYBUS experience…
          </div>
        </main>
      ) : error ? (
        <main className="container">
          <div className="empty">
            <h1>We couldn’t connect.</h1>
            <p>{error}</p>
            <button className="btn primary" onClick={load}>
              Try again
            </button>
          </div>
        </main>
      ) : (
        <main>
          {page === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-eyebrow">
                    <span className="dot" />A SMARTER WAY THROUGH YOUR CITY
                  </div>
                  <h1>Your city.<br /><span>Your next move.</span></h1>
                  <div className="hero-intro">
                    <p>A better everyday journey starts here. Discover routes, explore your city, and take the guesswork out of getting there.</p>
                    <div className="hero-actions">
                      <button className="btn primary" onClick={() => go("search")}>Find your bus <ArrowUpRight size={20} /></button>
                      <button className="btn outline" onClick={() => go("map")}><Navigation size={17} /> Explore tracking</button>
                    </div>
                    <div className="hero-brandline">LUCKNOW, LET’S GO <span>—</span> AAO CHALEN</div>
                  </div>
                </div>
                <div className="hero-visual">
                  <div className="photo-frame">
                    <img
                      src="/assets/brand/citybus-bus.png"
                      alt="Blue CITYBUS concept bus in Lucknow at sunset"
                      fetchPriority="high"
                    />
                    <div className="photo-caption">
                      <span>THE CITY IS YOURS.</span>
                      <b>Let’s get you there.</b>
                    </div>
                  </div>
                  <div className="arrival-card">
                    <span className="arrival-icon">
                      <BusFront size={25} />
                    </span>
                    <div>
                      <small>YOUR NEXT CONNECTION</small>
                      <strong>Polytechnic → Charbagh</strong>
                      <span>
                        <i />
                        Explore route CB101
                      </span>
                    </div>
                    <button
                      className="icon-btn"
                      aria-label="Explore CB101"
                      onClick={() => go("route/r0")}
                    >
                      <ArrowUpRight />
                    </button>
                  </div>
                  <div className="visual-note">
                    <span className="dot" />
                    CITYBUS CONCEPT · PROTOTYPE EXPERIENCE
                  </div>
                </div>
              </section>
              <section className="search-dock container">
                <div className="search-dock-label">
                  <span>Where are we going today?</span>
                  <small>
                    <MapPin size={13} />
                    Lucknow, Uttar Pradesh
                  </small>
                </div>
                <SearchForm hero />
                <div className="popular">
                  <span>Popular:</span>
                  <button
                    onClick={() => {
                      setFrom("s0");
                      setTo("s8");
                      go("search");
                    }}
                  >
                    Polytechnic → Charbagh
                  </button>
                  <button
                    onClick={() => {
                      setFrom("s10");
                      setTo("s6");
                      go("search");
                    }}
                  >
                    Gomti Nagar → Hazratganj
                  </button>
                  <span className="demo-note">Illustrative routes & fares</span>
                </div>
              </section>
              <div className="trust-strip container">
                <span>
                  <Route />
                  Routes that make sense
                </span>
                <span>
                  <Wallet />
                  Everyday affordability
                </span>
                <span>
                  <Navigation />
                  Tracking, made simple
                </span>
                <span>
                  <Leaf />
                  More shared. Less traffic.
                </span>
              </div>
              <div className="container">
                <AlertBanner />
              </div>
              <section className="section container">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">
                      FAMILIAR ROADS. BETTER JOURNEYS.
                    </span>
                    <h2>Your city, connected.</h2>
                    <p>
                      Explore a few everyday routes in our Lucknow demo network.
                    </p>
                  </div>
                  <button className="text-btn" onClick={() => go("routes")}>
                    All routes <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className="route-grid">
                  {routes.slice(0, 3).map((r) => (
                    <RouteCard key={r.id} r={r} />
                  ))}
                </div>
              </section>
              <section className="how-section">
                <div className="container">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">A LITTLE LESS COMPLICATED</span>
                      <h2>
                        From “where’s my bus?”
                        <br />
                        to “I’m on my way.”
                      </h2>
                    </div>
                    <p>
                      One platform for everyday bus travel.
                      <br />
                      Discover. Track. Pay.* Travel.
                    </p>
                  </div>
                  <div className="steps-grid">
                    {[
                      [
                        "01",
                        "Find your connection",
                        "Choose where you are and where you want to go.",
                        Search,
                      ],
                      [
                        "02",
                        "Know before you go",
                        "Explore stops, fares and simulated bus updates.",
                        Navigation,
                      ],
                      [
                        "03",
                        "Make the city yours",
                        "Plan a simpler, more affordable everyday journey.",
                        BusFront,
                      ],
                    ].map(([n, title, text, Icon]: any) => (
                      <article key={n}>
                        <div className="step-top">
                          <span>{n}</span>
                          <Icon size={25} />
                        </div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </article>
                    ))}
                  </div>
                  <small className="muted">
                    *Digital payments, passes and memberships are coming soon.
                  </small>
                </div>
              </section>
              <section className="section container">
                <div className="partner-banner">
                  <div>
                    <span className="eyebrow">GROW TOGETHER</span>
                    <h2>
                      Your fleet.
                      <br />A smarter future.
                    </h2>
                    <p>
                      Bring your buses, routes and experience.
                      <br />
                      Let’s build better city journeys together.
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => go("operators")}
                    >
                      Partner with CITYBUS <ArrowUpRight size={18} />
                    </button>
                  </div>
                  <div className="partner-art">
                    <img
                      src="/assets/brand/citybus-symbol.jpg"
                      alt="Official CITYBUS driver symbol"
                    />
                    <span>PASSENGER + BUS + OPERATOR</span>
                  </div>
                </div>
              </section>
            </>
          )}
          {page === "search" && (
            <section className="container section">
              {heading(
                "LET’S GET YOU THERE",
                "Find your next connection.",
                "Choose two stops to explore matching routes, buses and demo fares.",
              )}
              <SearchForm />
              <AlertBanner />
              <div className="section-heading results-heading">
                <h2>
                  {results
                    ? `${results.length} route${results.length === 1 ? "" : "s"} found`
                    : "Plan your journey"}
                </h2>
                <label className="sort-label">
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="earliest">Earliest arrival</option>
                    <option value="fastest">Fastest journey</option>
                    <option value="cheapest">Lowest fare</option>
                  </select>
                </label>
              </div>
              {searching ? (
                <div className="skeleton">Finding your connections…</div>
              ) : results?.length === 0 ? (
                <div className="empty">
                  <Route size={38} />
                  <h3>No direct route found</h3>
                  <p>
                    Try another stop pair. This prototype supports direct
                    journeys in the displayed direction.
                  </p>
                </div>
              ) : results ? (
                <div className="result-list">
                  {[...results]
                    .sort((a, b) =>
                      sort === "cheapest"
                        ? a.fare - b.fare
                        : sort === "fastest"
                          ? a.journeyMinutes - b.journeyMinutes
                          : (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999),
                    )
                    .map((r) => (
                      <article className="result-card" key={r.id}>
                        <div>
                          <span className="route-code">
                            <BusFront size={18} />
                            {r.routeCode}
                          </span>
                          <h3>
                            {r.fromName} → {r.toName}
                          </h3>
                          <p>
                            {r.stopCount} stops · {r.buses.length} available
                            demo buses
                          </p>
                        </div>
                        <div className="result-stat">
                          <strong>
                            {r.etaMinutes ? `~${r.etaMinutes} min` : "—"}
                          </strong>
                          <small>Demo arrival</small>
                        </div>
                        <div className="result-stat">
                          <strong>{r.journeyMinutes} min</strong>
                          <small>Journey</small>
                        </div>
                        <div className="result-stat">
                          <strong>{money(r.fare)}</strong>
                          <small>Demo fare</small>
                        </div>
                        <div className="result-actions">
                          <button
                            className="btn primary"
                            disabled={!r.buses.length}
                            onClick={() => go("map/" + r.buses[0].id)}
                          >
                            Track bus <Navigation size={15} />
                          </button>
                          <button
                            className="text-btn"
                            onClick={() => go("route/" + r.id)}
                          >
                            View route →
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              ) : (
                <div className="empty">
                  <Search size={34} />
                  <h3>A better journey starts here.</h3>
                  <p>Select your stops above and choose Find Buses.</p>
                </div>
              )}
            </section>
          )}
          {page === "routes" && (
            <section className="container section">
              {heading(
                "EXPLORE THE NETWORK",
                "Every route. A new possibility.",
                "A fictional demonstration network inspired by Lucknow’s everyday journeys.",
              )}
              <div className="filter-input">
                <Search size={20} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search route, bus number or destination"
                  aria-label="Search routes"
                />
              </div>
              <div className="route-grid">
                {routes
                  .filter((r) =>
                    (
                      r.routeCode +
                      " " +
                      r.source +
                      " " +
                      r.destination +
                      " " +
                      buses
                        .filter((b) => b.routeId === r.id)
                        .map((b) => b.busNumber)
                        .join(" ")
                    )
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((r) => (
                    <RouteCard key={r.id} r={r} />
                  ))}
              </div>
              {!routes.some((r) =>
                (
                  r.routeCode +
                  " " +
                  r.source +
                  " " +
                  r.destination +
                  " " +
                  buses
                    .filter((b) => b.routeId === r.id)
                    .map((b) => b.busNumber)
                    .join(" ")
                )
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ) && (
                <div className="empty">
                  No matching routes. Try a different search.
                </div>
              )}
            </section>
          )}
          {page === "route" && (
            <section className="container section">
              {detailError ? (
                <div className="empty">
                  <h2>Route unavailable</h2>
                  <p>{detailError}</p>
                  <button className="btn primary" onClick={() => go("routes")}>
                    Browse routes
                  </button>
                </div>
              ) : !detail ? (
                <div className="skeleton">Loading route…</div>
              ) : (
                <>
                  <button className="text-btn" onClick={() => go("routes")}>
                    ← All routes
                  </button>
                  {heading(
                    detail.routeCode,
                    detail.routeName,
                    detail.source + " → " + detail.destination,
                  )}
                  <AlertBanner />
                  <div className="detail-grid">
                    <div className="panel">
                      <div className="section-heading">
                        <h3>Your route, stop by stop.</h3>
                        <span className="pill">
                          {detail.stops.length} stops
                        </span>
                      </div>
                      <ol className="timeline">
                        {detail.stops.map((s: any, i: number) => (
                          <li key={s.id}>
                            <span className="timeline-dot">{i + 1}</span>
                            <div>
                              <strong>{s.stopName}</strong>
                              <small>
                                {s.estimatedOffsetMinutes} min from origin
                              </small>
                            </div>
                            <button
                              className="icon-btn"
                              aria-label={"Save " + s.stopName}
                              onClick={() => save("favouriteStops", s.id)}
                            >
                              <Heart size={17} />
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <div className="panel">
                        <div className="metric-grid">
                          <div>
                            <small>Demo base fare</small>
                            <h2>{money(detail.baseFare)}</h2>
                          </div>
                          <div>
                            <small>Journey time</small>
                            <h2>
                              {detail.estimatedDuration}
                              <small> min</small>
                            </h2>
                          </div>
                        </div>
                        <button
                          className="btn outline"
                          onClick={() => save("favouriteRoutes", detail.id)}
                        >
                          <Heart size={16} />
                          Save route
                        </button>
                      </div>
                      <div className="panel">
                        <h3>Buses on this route</h3>
                        {detail.buses.length ? (
                          detail.buses.map((b: any) => (
                            <div className="bus-row" key={b.id}>
                              <BusFront />
                              <div>
                                <strong>{b.busNumber}</strong>
                                <small>
                                  {b.type} · {b.status.replaceAll("_", " ")}
                                </small>
                              </div>
                              <button
                                className="text-btn"
                                onClick={() => go("map/" + b.id)}
                              >
                                Track →
                              </button>
                            </div>
                          ))
                        ) : (
                          <p>No buses assigned yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
          {page === "map" && (
            <section className="container section">
              {heading(
                "A LITTLE MORE CERTAINTY",
                "Your bus, in view.",
                "Bus locations are simulated unless explicitly marked GPS. Estimates are approximate.",
              )}
              <AlertBanner />
              <div className="tracking-grid">
                <aside className="panel">
                  <h3>Follow a connection</h3>
                  <label>
                    Select a bus
                    <select
                      value={selectedBus}
                      onChange={(e) => setSelectedBus(e.target.value)}
                    >
                      {buses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.busNumber} · {b.routeCode || "Unassigned"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {(() => {
                    const b = buses.find((b) => b.id === selectedBus),
                      r = routes.find((r) => r.id === b?.routeId);
                    return b ? (
                      <>
                        <span className="pill tracking-status">
                          {b.status.replaceAll("_", " ")}
                        </span>
                        <h2>{b.busNumber}</h2>
                        <p>
                          {r?.source} → {r?.destination}
                        </p>
                        <div className="info-lines">
                          <span>
                            Route <b>{r?.routeCode || "Unassigned"}</b>
                          </span>
                          <span>
                            Vehicle{" "}
                            <b>
                              {b.type} · {b.capacity} seats
                            </b>
                          </span>
                          <span>
                            Demo base fare <b>{r ? money(r.baseFare) : "—"}</b>
                          </span>
                          <span>
                            Updates <b>Every 5 seconds</b>
                          </span>
                        </div>
                        {r && (
                          <button
                            className="btn outline"
                            onClick={() => go("route/" + r.id)}
                          >
                            View route <ArrowUpRight size={17} />
                          </button>
                        )}
                      </>
                    ) : null;
                  })()}
                  <p className="fineprint">
                    This is a schematic map, not turn-by-turn navigation.
                    Connect a map provider for a geographic basemap.
                  </p>
                </aside>
                <RouteMap busId={selectedBus} userLocation={geo} />
              </div>
            </section>
          )}
          {page === "stops" && (
            <section className="container section">
              {heading(
                "YOUR JOURNEY STARTS NEARBY",
                "Find your starting point.",
                "Explore the demo stops, or use your location to sort them by distance.",
              )}
              <div className="stop-tools">
                <div className="filter-input">
                  <Search size={20} />
                  <input
                    aria-label="Search stops"
                    placeholder="Search a stop or neighbourhood"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn primary"
                  onClick={() => {
                    setLocationMessage("Requesting location…");
                    if (!navigator.geolocation) {
                      setLocationMessage(
                        "Location is unavailable. Search a stop manually.",
                      );
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      async (p) => {
                        setGeo(p.coords);
                        try {
                          setNearby(
                            await api(
                              `stops/nearby?lat=${p.coords.latitude}&lng=${p.coords.longitude}`,
                            ),
                          );
                          setLocationMessage(
                            "Sorted by distance from your location.",
                          );
                        } catch (e: any) {
                          setLocationMessage(e.message);
                        }
                      },
                      () =>
                        setLocationMessage(
                          "Location permission was denied or unavailable. Search a stop manually.",
                        ),
                      { timeout: 12000 },
                    );
                  }}
                >
                  <LocateFixed size={18} />
                  Use my location
                </button>
                {nearby && (
                  <button
                    className="text-btn"
                    onClick={() => {
                      setNearby(null);
                      setLocationMessage("");
                    }}
                  >
                    Show all
                  </button>
                )}
              </div>
              {locationMessage && <p role="status">{locationMessage}</p>}
              <div className="stop-grid">
                {(nearby || stops)
                  .filter((s) =>
                    s.stopName.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((s) => (
                    <article className="panel stop-card" key={s.id}>
                      <div className="card-top">
                        <span className="feature-icon">
                          <MapPin size={23} />
                        </span>
                        <button
                          className="icon-btn"
                          aria-label={"Save stop " + s.stopName}
                          onClick={() => save("favouriteStops", s.id)}
                        >
                          <Heart size={18} />
                        </button>
                      </div>
                      <h3>{s.stopName}</h3>
                      <p>
                        {s.distance !== undefined
                          ? `${s.distance.toFixed(1)} km away`
                          : "Lucknow · Demo stop"}
                      </p>
                      <div className="chips">
                        {s.routes?.map((r: any) => (
                          <button
                            key={r.id}
                            onClick={() => go("route/" + r.id)}
                          >
                            {r.routeCode} ↗
                          </button>
                        ))}
                      </div>
                      <button
                        className="text-btn"
                        onClick={() => {
                          setFrom(s.id);
                          go("search");
                        }}
                      >
                        Travel from here <ArrowRight size={16} />
                      </button>
                    </article>
                  ))}
              </div>
              {!(nearby || stops).some((s) =>
                s.stopName.toLowerCase().includes(query.toLowerCase()),
              ) && <div className="empty">No stops match your search.</div>}
            </section>
          )}
          {page === "passes" && (
            <section className="container section">
              {heading(
                "A LITTLE MORE EVERYDAY VALUE",
                "Good journeys. Great possibilities.",
                "Our pass plans are a preview. Purchases and payments are not yet available.",
              )}
              <div className="route-grid">
                {plans.map((p, i) => (
                  <article
                    className={"pass-card " + (i === 1 ? "featured" : "")}
                    key={p.id}
                  >
                    <span className="pill">COMING SOON</span>
                    <Ticket size={32} />
                    <h2>{p.name}</h2>
                    <p>
                      {p.duration === 1
                        ? "One day of possibilities"
                        : p.duration + " days of easier planning"}
                    </p>
                    <div className="pass-price">
                      {money(p.price)}
                      <small>indicative demo price</small>
                    </div>
                    <p>
                      <Check size={15} />
                      Designed for everyday commuters
                    </p>
                    <p>
                      <Check size={15} />
                      Digital pass concept
                    </p>
                    <button className="btn outline" disabled>
                      Purchases not available
                    </button>
                  </article>
                ))}
              </div>
              <div className="two-grid section">
                <div className="panel">
                  <Wallet className="blue" />
                  <h3>CityMoney</h3>
                  <span className="pill">COMING SOON</span>
                  <p>
                    A future digital payment experience for your city journeys.
                    No funds can be added or spent in this prototype.
                  </p>
                </div>
                <div className="panel">
                  <ShieldCheck className="blue" />
                  <h3>CITYBUS Pro</h3>
                  <span className="pill">CONCEPT PREVIEW</span>
                  <p>
                    We’re exploring travel rewards and partner benefits.
                    Features, eligibility and pricing are not confirmed.
                  </p>
                </div>
              </div>
            </section>
          )}
          {page === "operators" && (
            <section className="operators-page section">
              <div className="operator-hero">
                <div className="container operator-intro">
                  {heading(
                    "BETTER JOURNEYS START WITH PARTNERS",
                    "Move your fleet forward.",
                    "Connect your buses with passengers looking for a simpler way through their city.",
                  )}
                  <div className="chips">
                    <span>Route visibility</span>
                    <span>Fleet tools</span>
                    <span>GPS-ready architecture</span>
                  </div>
                  <a
                    className="btn primary"
                    href="#partner-form"
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById("partner-form")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Let’s work together <ArrowUpRight size={18} />
                  </a>
                </div>
                <img
                  src="/assets/brand/citybus-bus.png"
                  alt="CITYBUS branded bus for the operator partnership concept"
                />
              </div>
              <div className="three-grid section container">
                {titleIcon(
                  BusFront,
                  "Bring your fleet",
                  "Manage bus details, service status and assigned routes in one place.",
                )}
                {titleIcon(
                  Navigation,
                  "Build visibility",
                  "Prepare your vehicles for secure GPS location reporting.",
                )}
                {titleIcon(
                  Building2,
                  "Grow with the city",
                  "Start a conversation about a responsible, practical pilot.",
                )}
              </div>
              <div className="two-grid container" id="partner-form">
                <div>
                  <span className="eyebrow">LET’S BUILD THIS TOGETHER</span>
                  <h2>
                    A better connection
                    <br />
                    starts with hello.
                  </h2>
                  <p>
                    Tell us about your fleet. Applications are saved for review
                    in the admin workspace.
                  </p>
                  <p className="fineprint">
                    For account approval, register using the same email as your
                    application. Partnerships are subject to review; applying
                    does not guarantee acceptance.
                  </p>
                </div>
                <div className="panel">
                  <Form
                    fields={[
                      { name: "companyName", label: "Fleet / operator name" },
                      { name: "contactPerson", label: "Contact person" },
                      { name: "email", label: "Email", type: "email" },
                      { name: "phone", label: "Phone", type: "tel" },
                      { name: "city", label: "City" },
                      {
                        name: "numberOfBuses",
                        label: "Number of buses",
                        type: "number",
                        min: 1,
                        max: 10000,
                      },
                      { name: "currentRoutes", label: "Existing routes" },
                      {
                        name: "gpsAvailable",
                        label: "GPS availability",
                        options: [
                          { value: "0", label: "Not yet" },
                          { value: "1", label: "Available" },
                        ],
                      },
                      {
                        name: "message",
                        label: "Tell us more",
                        type: "textarea",
                        required: false,
                      },
                    ]}
                    initial={{ city: "Lucknow" }}
                    submit={(d) => api("operators/apply", "POST", d)}
                    label="Submit partnership application"
                  />
                </div>
              </div>
            </section>
          )}
          {page === "login" && (
            <section className="auth-section container">
              <div className="auth-story">
                <img
                  src="/assets/brand/citybus-logo.jpg"
                  alt="CITYBUS AAO CHALEN official branding"
                />
                <h1>
                  Your everyday.
                  <br />A little easier.
                </h1>
                <p>
                  Save your routes. Find your stops.
                  <br />
                  Keep your city within reach.
                </p>
              </div>
              <div className="auth-form panel">
                <span className="eyebrow">WELCOME TO CITYBUS</span>
                <h2>
                  {register
                    ? "Your journey starts here."
                    : "Good to see you again."}
                </h2>
                <p>
                  {register
                    ? "Create your passenger account."
                    : "Sign in to your account to keep moving."}
                </p>
                <Form
                  key={String(register)}
                  fields={[
                    ...(register
                      ? [
                          { name: "fullName", label: "Full name" },
                          {
                            name: "phone",
                            label: "Phone",
                            type: "tel",
                            required: false,
                          },
                        ]
                      : []),
                    { name: "email", label: "Email address", type: "email" },
                    {
                      name: "password",
                      label: "Password (10+ characters)",
                      type: "password",
                    },
                    ...(register
                      ? [
                          {
                            name: "confirmPassword",
                            label: "Confirm password",
                            type: "password",
                          },
                        ]
                      : []),
                  ]}
                  submit={(d) =>
                    api("auth/" + (register ? "register" : "login"), "POST", d)
                  }
                  label={register ? "Create account" : "Sign in"}
                  onDone={(d) => {
                    setUser(d.user);
                    go("account");
                  }}
                />
                <button
                  className="text-btn auth-switch"
                  onClick={() => setRegister(!register)}
                >
                  {register
                    ? "Already have an account? Sign in"
                    : "New here? Create an account"}{" "}
                  <ArrowRight size={15} />
                </button>
                <button className="text-btn" onClick={() => go("forgot")}>
                  Forgot password?
                </button>
                {demo && (
                  <div className="demo-access">
                    <span className="eyebrow">EXPLORE THE PRIVATE DEMO</span>
                    <p>Shared sample accounts. Please use fictional details.</p>
                    <div className="demo-buttons">
                      {["PASSENGER", "OPERATOR", "ADMIN"].map((role) => (
                        <button
                          key={role}
                          onClick={async () => {
                            try {
                              const d = await api("auth/demo", "POST", {
                                role,
                              });
                              setUser(d.user);
                              go(
                                role === "PASSENGER" ? "account" : "workspace",
                              );
                            } catch (e: any) {
                              notify(e.message);
                            }
                          }}
                        >
                          {role[0] + role.slice(1).toLowerCase()}{" "}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          {page === "forgot" && (
            <section className="container section narrow">
              {heading(
                "ACCOUNT HELP",
                "Recover your account.",
                "Email delivery is not connected in this prototype. The form explains the current recovery status.",
              )}
              <Form
                fields={[{ name: "email", label: "Email", type: "email" }]}
                submit={(d) => api("auth/forgot-password", "POST", d)}
                label="Check recovery options"
              />
            </section>
          )}
          {page === "account" && (
            <section className="container section">
              {!user ? (
                <div className="empty">
                  <h1>Your journeys, all together.</h1>
                  <p>Sign in to save routes and manage your account.</p>
                  <button className="btn primary" onClick={() => go("login")}>
                    Sign in
                  </button>
                </div>
              ) : (
                <>
                  <div className="section-heading">
                    {heading(
                      "YOUR CITYBUS",
                      `Welcome back, ${user.fullName.split(" ")[0]}.`,
                      "A little less planning. A little more going.",
                    )}
                    <div className="button-row">
                      {user.role !== "PASSENGER" && (
                        <button
                          className="btn primary"
                          onClick={() => go("workspace")}
                        >
                          {user.role === "ADMIN"
                            ? "Admin workspace"
                            : "Operator workspace"}{" "}
                          <ArrowUpRight size={16} />
                        </button>
                      )}
                      <button
                        className="btn outline"
                        onClick={async () => {
                          try {
                            await api("auth/logout", "POST", {});
                            setUser(null);
                            setAccount(null);
                            go("home");
                          } catch (e: any) {
                            notify(e.message);
                          }
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                  {!account ? (
                    <div className="skeleton">Loading your account…</div>
                  ) : (
                    <>
                      <div className="two-grid">
                        <div className="panel">
                          <h3>
                            <Heart size={20} />
                            Favourite routes
                          </h3>
                          {account.favouriteRoutes.length ? (
                            account.favouriteRoutes.map((r: any) => (
                              <div className="saved-row" key={r.id}>
                                <button
                                  className="text-btn"
                                  onClick={() => go("route/" + r.id)}
                                >
                                  {r.routeCode} · {r.destination}
                                </button>
                                <button
                                  className="icon-btn"
                                  aria-label={"Remove " + r.routeCode}
                                  onClick={async () => {
                                    await api(
                                      "me/favouriteRoutes/" + r.favouriteId,
                                      "DELETE",
                                      {},
                                    );
                                    refreshAccount();
                                  }}
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p>Save a route using its heart icon.</p>
                          )}
                          <button
                            className="text-btn"
                            onClick={() => go("routes")}
                          >
                            Explore routes →
                          </button>
                        </div>
                        <div className="panel">
                          <h3>
                            <MapPin size={20} />
                            Favourite stops
                          </h3>
                          {account.favouriteStops.length ? (
                            account.favouriteStops.map((s: any) => (
                              <div className="saved-row" key={s.id}>
                                <span>{s.stopName}</span>
                                <button
                                  className="icon-btn"
                                  aria-label={"Remove " + s.stopName}
                                  onClick={async () => {
                                    await api(
                                      "me/favouriteStops/" + s.favouriteId,
                                      "DELETE",
                                      {},
                                    );
                                    refreshAccount();
                                  }}
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p>Your familiar stops will appear here.</p>
                          )}
                          <button
                            className="text-btn"
                            onClick={() => go("stops")}
                          >
                            Find a stop →
                          </button>
                        </div>
                        <div className="panel">
                          <h3>
                            <Clock size={20} />
                            Recent journeys
                          </h3>
                          {account.journeys.length ? (
                            account.journeys.slice(0, 5).map((j: any) => (
                              <div className="saved-row" key={j.id}>
                                <div>
                                  {j.source} → {j.destination}
                                  <small>
                                    {new Date(
                                      j.searchedAt,
                                    ).toLocaleDateString()}
                                  </small>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p>Your signed-in searches will appear here.</p>
                          )}
                        </div>
                        <div className="panel">
                          <h3>
                            <House size={20} />
                            Saved places
                          </h3>
                          {account.savedPlaces.map((p: any) => (
                            <div className="saved-row" key={p.id}>
                              <span>
                                {p.label} · {p.stopName}
                              </span>
                              <button
                                className="icon-btn"
                                aria-label={"Remove " + p.label}
                                onClick={async () => {
                                  await api(
                                    "me/savedPlaces/" + p.id,
                                    "DELETE",
                                    {},
                                  );
                                  refreshAccount();
                                }}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                          <Form
                            fields={[
                              { name: "label", label: "Place name" },
                              {
                                name: "stopId",
                                label: "Closest stop",
                                options: stops.map((s) => ({
                                  value: s.id,
                                  label: s.stopName,
                                })),
                              },
                            ]}
                            submit={(d) => api("me/savedPlaces", "POST", d)}
                            label="Save place"
                            onDone={refreshAccount}
                          />
                        </div>
                        <div className="panel">
                          <h3>Profile</h3>
                          <Form
                            fields={[
                              { name: "fullName", label: "Full name" },
                              {
                                name: "phone",
                                label: "Phone",
                                type: "tel",
                                required: false,
                              },
                            ]}
                            initial={user}
                            submit={(d) => api("me/profile", "PATCH", d)}
                            onDone={() =>
                              api("auth/me").then((d) => setUser(d.user))
                            }
                          />
                          <p className="fineprint">
                            {user.email} · {user.role}
                          </p>
                        </div>
                        <div className="panel wallet-preview">
                          <Wallet size={30} />
                          <h3>CityMoney & passes</h3>
                          <span className="pill">COMING SOON</span>
                          <p>
                            Your future travel essentials, in one place. Wallet
                            transactions and pass purchases are disabled.
                          </p>
                          <button
                            className="text-btn"
                            onClick={() => go("passes")}
                          >
                            Explore the preview →
                          </button>
                        </div>
                      </div>
                      <AlertBanner />
                    </>
                  )}
                </>
              )}
            </section>
          )}
          {page === "workspace" && (
            <section className="workspace">
              {!user || user.role === "PASSENGER" ? (
                <div className="empty">
                  <h1>Workspace access required</h1>
                  <p>Sign in with an operator or admin account.</p>
                  <button className="btn primary" onClick={() => go("login")}>
                    Sign in
                  </button>
                </div>
              ) : (
                <Management role={user.role} notify={notify} />
              )}
            </section>
          )}
          {page === "about" && (
            <section className="container section">
              {heading(
                "CITYBUS — AAO CHALEN",
                "Making everyday bus travel smarter.",
                "Smart Mobility. Affordable Journeys.",
              )}
              <div className="about-image">
                <img
                  src="/assets/brand/citybus-bus.png"
                  alt="The supplied CITYBUS bus concept in Lucknow"
                />
              </div>
              <div className="three-grid section">
                {titleIcon(
                  Search,
                  "The problem",
                  "Affordable buses exist, but information is fragmented. Knowing where to board, which route to take and when a bus arrives can be difficult.",
                )}
                {titleIcon(
                  Route,
                  "Our mission",
                  "Make city-bus transportation easier to discover, understand and use through a single digital platform.",
                )}
                {titleIcon(
                  Leaf,
                  "Our vision",
                  "Build digital infrastructure for affordable shared urban mobility, connecting passengers, buses and operators.",
                )}
              </div>
              <div className="panel">
                <h3>A prototype with a practical purpose.</h3>
                <p>
                  CITYBUS is at the prototype stage. We are exploring pilot
                  partnerships, mentorship and reliable transport data. This
                  website demonstrates the product; it does not represent a
                  currently operating bus service.
                </p>
                <button className="btn primary" onClick={() => go("contact")}>
                  Start a conversation <ArrowUpRight size={17} />
                </button>
              </div>
            </section>
          )}
          {page === "help" && (
            <section className="container section narrow">
              {heading(
                "A HELPING HAND",
                "A few things, explained.",
                "Everything you need to explore the CITYBUS prototype.",
              )}
              <div className="faq-list">
                {[
                  [
                    "Finding buses",
                    "How do I find the right bus?",
                    "Choose your departure and destination stops, then select Find Buses. We show direct routes only when the departure comes before the destination.",
                  ],
                  [
                    "Routes",
                    "Are these actual timetables?",
                    "No. Routes, fares and vehicle assignments are fictional demonstration data. They must be verified with operators before a real launch.",
                  ],
                  [
                    "Tracking",
                    "Is the bus location live?",
                    "Demo buses move along a simulated route. Only authorized GPS submissions are marked GPS, and stale updates are flagged. The map is schematic.",
                  ],
                  [
                    "Account",
                    "How do I save my regular route?",
                    "Create an account or use a demo account, then tap the heart on a route or stop. Your favourites appear in My account.",
                  ],
                  [
                    "Operators",
                    "How can my fleet join?",
                    "Submit the partnership form and register with the same email. An administrator can review your application and assign routes.",
                  ],
                  [
                    "Payments",
                    "Can I pay for a journey here?",
                    "No. No real or simulated financial transaction is processed. CityMoney and payment integrations are future work.",
                  ],
                  [
                    "Passes",
                    "Can I buy a student or monthly pass?",
                    "Not yet. Plans and prices are concepts only; purchases remain disabled.",
                  ],
                ].map(([cat, q, a]) => (
                  <details key={q}>
                    <summary>
                      <span>
                        <small>{cat}</small>
                        {q}
                      </span>
                      <span>+</span>
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
              <div className="panel">
                <h3>Still need a hand?</h3>
                <button className="btn primary" onClick={() => go("contact")}>
                  Contact CITYBUS <ArrowUpRight size={16} />
                </button>
              </div>
            </section>
          )}
          {page === "contact" && (
            <section className="container section">
              {heading(
                "SAY HELLO",
                "Better mobility starts with a conversation.",
                "Have a question, a route suggestion or a partnership idea? We’re listening.",
              )}
              <div className="two-grid">
                <div className="contact-copy">
                  <h2>
                    Let’s move
                    <br />
                    something forward.
                  </h2>
                  <p>
                    For commuters, operators, mentors
                    <br />
                    and everyone who believes in better city travel.
                  </p>
                  <div className="contact-detail">
                    <MapPin />
                    Lucknow, Uttar Pradesh
                  </div>
                  <p className="fineprint">
                    Messages are saved to the prototype’s admin inbox. No
                    automated email delivery is enabled.
                  </p>
                </div>
                <div className="panel">
                  <Form
                    fields={[
                      { name: "name", label: "Your name" },
                      { name: "email", label: "Email", type: "email" },
                      {
                        name: "phone",
                        label: "Phone",
                        type: "tel",
                        required: false,
                      },
                      { name: "subject", label: "Subject" },
                      {
                        name: "message",
                        label: "Your message",
                        type: "textarea",
                      },
                    ]}
                    submit={(d) => api("contact", "POST", d)}
                    label="Send message"
                  />
                </div>
              </div>
            </section>
          )}
          {page === "alerts" && (
            <section className="container section narrow">
              {heading(
                "NETWORK NOTES",
                "Service updates.",
                "Demonstration alerts for the CITYBUS network.",
              )}
              {alerts.map((a) => (
                <article className="panel" key={a.id}>
                  <span className="pill">
                    {a.severity} · {a.routeCode || "NETWORK"}
                  </span>
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                </article>
              ))}
              {!alerts.length && <p>No active alerts.</p>}
            </section>
          )}
          {["privacy", "terms", "cookies", "refund"].includes(page) && (
            <section className="container section narrow">
              {heading(
                "PROTOTYPE POLICIES",
                (
                  {
                    privacy: "Privacy notice",
                    terms: "Terms of use",
                    cookies: "Cookie notice",
                    refund: "Payments & refunds",
                  } as any
                )[page],
                "Draft notice for this demonstration product. Review before commercial launch.",
              )}
              <div className="panel">
                {page === "privacy" ? (
                  <>
                    <h3>Information you provide</h3>
                    <p>
                      Accounts store your name, email, optional phone number and
                      a password hash. Saved routes, searches, partnership
                      applications and contact messages are stored in the
                      application database.
                    </p>
                    <h3>Location</h3>
                    <p>
                      Your browser location is requested only when you choose
                      Use my location. It is used to sort stops and is not added
                      to your account record.
                    </p>
                    <h3>Your choices</h3>
                    <p>
                      Use fictional details when exploring shared demo accounts.
                      To request data correction or deletion, submit a contact
                      message. This prototype has no advertising analytics.
                    </p>
                  </>
                ) : page === "terms" ? (
                  <>
                    <h3>A demonstration, not a transport service</h3>
                    <p>
                      Do not rely on the sample routes, prices or ETAs for
                      actual travel. There is no ticket purchase, seat
                      reservation or guaranteed departure. Commercial services
                      require verified operators and approved policies.
                    </p>
                    <h3>Responsible use</h3>
                    <p>
                      Use your own account, respect other users’ data and do not
                      submit sensitive personal information to the demo.
                    </p>
                  </>
                ) : page === "cookies" ? (
                  <>
                    <h3>Essential session cookie</h3>
                    <p>
                      CITYBUS uses an HttpOnly session cookie named
                      citybus_session for sign-in. It expires after one day and
                      is removed when you sign out. No optional tracking cookies
                      are used by this application.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>No payments are accepted</h3>
                    <p>
                      Payments, wallet loading and pass purchases are disabled.
                      This prototype cannot charge you, so no purchase or refund
                      can be processed here. A production refund policy must be
                      approved before payments launch.
                    </p>
                  </>
                )}
              </div>
              <button className="text-btn" onClick={() => go("contact")}>
                Questions? Contact us →
              </button>
            </section>
          )}
          {![
            "home",
            "search",
            "routes",
            "route",
            "map",
            "stops",
            "passes",
            "operators",
            "login",
            "forgot",
            "account",
            "workspace",
            "about",
            "help",
            "contact",
            "alerts",
            "privacy",
            "terms",
            "cookies",
            "refund",
          ].includes(page) && (
            <section className="container empty">
              <h1>Looks like a missed turn.</h1>
              <p>This page doesn’t exist.</p>
              <button className="btn primary" onClick={() => go("home")}>
                Back to home
              </button>
            </section>
          )}
        </main>
      )}
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img
              src="/assets/brand/citybus-logo.jpg"
              alt="CITYBUS — AAO CHALEN"
            />
            <p>
              Smart Mobility.
              <br />
              Affordable Journeys.
            </p>
            <span className="pill">BUILT FOR EVERYDAY.</span>
          </div>
          {[
            [
              "Product",
              ["Find Bus", "search"],
              ["Live Map", "map"],
              ["Routes", "routes"],
              ["Stops", "stops"],
              ["Passes", "passes"],
            ],
            [
              "Company",
              ["About CITYBUS", "about"],
              ["For Operators", "operators"],
              ["Contact", "contact"],
            ],
            [
              "Support",
              ["Help & FAQ", "help"],
              ["Service alerts", "alerts"],
              ["Report an issue", "contact"],
            ],
            [
              "Legal",
              ["Privacy", "privacy"],
              ["Terms", "terms"],
              ["Cookies", "cookies"],
              ["Refund policy", "refund"],
            ],
          ].map(([label, ...links]: any) => (
            <div key={label}>
              <h4>{label}</h4>
              {links.map(([name, path]: any) => (
                <a key={path} href={"#/" + path}>
                  {name}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Citybus. All rights reserved.</span>
          <span>
            Instagram · LinkedIn <small>Links coming soon</small>
          </span>
          <span>Designed for the way you move. ↗</span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          ["Home", "home", House],
          ["Search", "search", Search],
          ["Map", "map", Navigation],
          ["Passes", "passes", Ticket],
          ["Account", "account", User],
        ].map(([label, path, Icon]: any) => (
          <button
            key={path}
            className={page === path ? "active" : ""}
            onClick={() => go(path)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </>
  );
}
