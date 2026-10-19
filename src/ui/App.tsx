import { useEffect, useRef, useState } from "react";
import type { KandiduStore } from "../storage/port";
import { BackupImport } from "./data/BackupImport";
import { DataPage } from "./data/DataView";
import { focusOnMount, useReturnFocus } from "./focus";
import { Home } from "./Home";
import { errorMessage, useMessages } from "./i18n";
import { LeadView } from "./lead/LeadView";
import { NotFound } from "./NotFound";
import { PlaceholderHelp } from "./PlaceholderHelp";
import { ProjectView } from "./project/ProjectView";
import { Link, type Route, useRoute } from "./router";
import { SetupView } from "./setup/SetupView";
import { AppProvider, useApp, type WriteFailure } from "./state";

export function App({ store }: { store: KandiduStore }) {
  return (
    <AppProvider store={store}>
      <Shell />
    </AppProvider>
  );
}

function routeKey(route: Route): string {
  return JSON.stringify(route);
}

function Shell() {
  const m = useMessages();
  const route = useRoute();
  const { state, stale, notice, failure, clearFailure } = useApp();
  const main = useRef<HTMLElement>(null);
  const firstRoute = useRef(true);
  const key = routeKey(route);

  // A write failure belongs to the view it happened in; its form is gone.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per route
  useEffect(() => clearFailure(), [key]);

  // Move focus to the new page heading on navigation (not on first load).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per route
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const heading = main.current?.querySelector("h1");
    if (heading instanceof HTMLElement) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [key]);

  return (
    <>
      <button
        type="button"
        className="skip-link"
        onClick={() => main.current?.focus()}
      >
        {m.common.skipToContent}
      </button>
      <header className="app-header">
        <div className="app-header-inner">
          <a href="#/" className="brand">
            {m.common.appName}
          </a>
          <nav aria-label={m.nav.label}>
            <ul>
              <li>
                <Link to={{ name: "home" }}>{m.nav.home}</Link>
              </li>
              <li>
                <Link to={{ name: "setup", step: "profil" }}>
                  {m.nav.setup}
                </Link>
              </li>
              <li>
                <Link to={{ name: "placeholders" }}>{m.nav.placeholders}</Link>
              </li>
              <li>
                <Link to={{ name: "data" }}>{m.nav.data}</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {stale && <StaleBanner />}
        {failure && <FailureAlert key={failure.id} failure={failure} />}
        <div className="live" role="status" aria-live="polite">
          {notice?.kind === "status" && (
            <span key={notice.id}>{notice.text}</span>
          )}
        </div>
        <div className="live-alert" role="alert">
          {notice?.kind === "error" && (
            <p key={notice.id} className="error">
              {notice.text}
            </p>
          )}
        </div>
        {state.kind === "loading" && <p>{m.common.working}</p>}
        {state.kind === "failed" && <Recovery cause={state.cause} />}
        {state.kind === "ready" && <Page route={route} />}
      </main>
      <footer className="app-footer">
        <p>{m.common.localNotice}</p>
      </footer>
    </>
  );
}

function StaleBanner() {
  const m = useMessages();
  return (
    <div className="banner" role="alert">
      <p>{m.common.staleBanner}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {m.common.reload}
      </button>
    </div>
  );
}

/**
 * A failed write; the form keeps its input (FR-040). Focus stays on the
 * control that started the write, so it can simply be activated again.
 */
function FailureAlert({ failure }: { failure: WriteFailure }) {
  const m = useMessages();
  // Runs after the render that re-enabled the controls.
  useEffect(() => failure.keepFocus(), [failure]);
  return (
    <div className="banner failure" role="alert">
      <p>{failure.text}</p>
      <div className="actions compact">
        {failure.retry && (
          <button type="button" onClick={failure.retry}>
            {m.common.retry}
          </button>
        )}
        <button type="button" className="secondary" onClick={failure.dismiss}>
          {m.common.close}
        </button>
      </div>
    </div>
  );
}

function Recovery({ cause }: { cause: unknown }) {
  const m = useMessages();
  const { reload, reset, busy } = useApp();
  const [confirming, setConfirming] = useState(false);
  const resetFocus = useReturnFocus(confirming);
  return (
    <section className="card" aria-labelledby="recovery-heading">
      <h1 id="recovery-heading">{m.recovery.heading}</h1>
      <p className="error">{errorMessage(cause, m)}</p>
      <p>{m.recovery.intro}</p>
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void reload()}>
          {m.common.retry}
        </button>
        {!confirming && (
          <button
            type="button"
            className="secondary"
            disabled={busy}
            ref={resetFocus.opener}
            onClick={() => setConfirming(true)}
          >
            {m.recovery.resetStart}
          </button>
        )}
      </div>
      <h2>{m.backup.importHeading}</h2>
      <p>{m.backup.recoveryHint}</p>
      <BackupImport hasData />
      {confirming && (
        <fieldset className="confirm">
          <legend>{m.recovery.resetStart}</legend>
          <p>{m.recovery.resetPrompt}</p>
          <div className="actions">
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => void reset()}
            >
              {m.recovery.resetConfirm}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              ref={focusOnMount}
              onClick={() => {
                resetFocus.returnFocus();
                setConfirming(false);
              }}
            >
              {m.common.cancel}
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case "home":
      return <Home />;
    case "setup":
      return <SetupView step={route.step} />;
    case "placeholders":
      return <PlaceholderHelp />;
    case "data":
      return <DataPage />;
    case "project":
      return <ProjectView projectId={route.projectId} step={route.step} />;
    case "lead":
      return (
        <LeadView
          projectId={route.projectId}
          leadId={route.leadId}
          step={route.step}
        />
      );
    case "notFound":
      return <NotFound />;
  }
}
