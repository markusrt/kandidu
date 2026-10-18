import { PLACEHOLDERS } from "../domain/placeholders";
import { useMessages } from "./i18n";

export function PlaceholderHelp() {
  const m = useMessages();
  const h = m.placeholderHelp;
  return (
    <>
      <h1>{h.heading}</h1>
      <section className="card">
        <p>{h.intro}</p>
        <ul>
          {h.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="block-heading">
        <h2 id="block-heading">{h.blockHeading}</h2>
        <p>{h.blockText}</p>
        <pre className="example">{h.blockExample.join("\n")}</pre>
        <p>{h.blockAfter}</p>
      </section>
      <section className="card" aria-labelledby="list-heading">
        <h2 id="list-heading">{h.listHeading}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{h.columnName}</th>
                <th scope="col">{h.columnMeaning}</th>
                <th scope="col">{h.columnExample}</th>
                <th scope="col">{h.columnWhere}</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDERS.map((placeholder) => {
                const [meaning, example] = h.entries[placeholder.name] ?? [
                  "",
                  "",
                ];
                return (
                  <tr key={placeholder.name}>
                    <th scope="row">
                      <code>
                        {placeholder.kind === "block"
                          ? `{#${placeholder.name}}`
                          : `{${placeholder.name}}`}
                      </code>
                    </th>
                    <td>{meaning}</td>
                    <td>{example}</td>
                    <td>
                      {placeholder.templates.includes("cv")
                        ? h.whereBoth
                        : h.whereCover}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
