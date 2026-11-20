export default function ConfigRequired({ missingVars = [] }) {
  return (
    <div className="config-required-shell">
      <div
        className="config-required-card"
        role="region"
        aria-labelledby="config-heading"
      >
        <h1 id="config-heading">Configuration required</h1>
        <p>
          Proof of Work OS requires the following environment variables to be
          configured in your <code>client/.env</code> file before starting:
        </p>
        <ul>
          {missingVars.map((varName) => (
            <li key={varName}>{varName}</li>
          ))}
        </ul>
        <p>
          Please supply these values and reload the application. No network
          requests will be made until configuration is complete.
        </p>
      </div>
    </div>
  );
}
