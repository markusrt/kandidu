import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createIndexedDbStore } from "./storage/indexeddb";
import { App } from "./ui/App";
import { catalogs, defaultLocale, MessagesProvider } from "./ui/i18n";
import "./ui/style.css";

const locale = defaultLocale;
document.documentElement.lang = locale;
document.title = catalogs[locale].documentTitle;

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root.");
createRoot(root).render(
  <StrictMode>
    <MessagesProvider locale={locale}>
      <App store={createIndexedDbStore()} />
    </MessagesProvider>
  </StrictMode>,
);
