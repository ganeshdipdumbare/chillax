import { PlatformLogoRow } from "../overlay/PlatformChip";
import { appVersionLabel } from "../shared/version";

export function PopupHint() {
  return (
    <div className="popup-root">
      <main>
        <div className="brand">
          <span className="logo" aria-hidden="true">Cx</span>
          <div>
            <div className="brand-title">
              <h1>Chillax</h1>
              <span className="ver" title={`Chillax ${appVersionLabel()}`}>
                {appVersionLabel()}
              </span>
            </div>
            <p>Watch together · chat · call</p>
          </div>
        </div>
        <p className="kicker">Open a video first</p>
        <p className="error" role="status">
          Open a supported streaming site first, then click Chillax again.
        </p>
        <PlatformLogoRow compact />
        <p>If you have an invite, open that link on the same site — Chillax joins for you.</p>
        <p className="foot">Free · peer-to-peer · your account</p>
      </main>
    </div>
  );
}

export function Popup() {
  return <PopupHint />;
}
