import { useMessages } from "./i18n";
import { Link } from "./router";

export function NotFound() {
  const m = useMessages();
  return (
    <section className="card">
      <h1>{m.common.notFoundHeading}</h1>
      <p>{m.common.notFoundText}</p>
      <Link to={{ name: "home" }}>{m.common.toHome}</Link>
    </section>
  );
}
