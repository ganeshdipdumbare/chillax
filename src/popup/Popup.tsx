export function PopupHint() {
  return (
    <div className="popup-root">
      <main>
        <div className="brand">
          <span className="logo" aria-hidden="true">Cx</span>
          <div>
            <h1>Chillax</h1>
            <p>Watch together · chat · call</p>
          </div>
        </div>
        <p className="kicker">Open a video first</p>
        <p className="error" role="status">
          Open YouTube or Netflix first, then click Chillax again.
        </p>
        <p>
          If you have an invite, open that YouTube or Netflix link. Chillax joins for you.
        </p>
      </main>
    </div>
  );
}

export function Popup() {
  return <PopupHint />;
}
