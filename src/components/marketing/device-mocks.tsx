import fx from "./features.module.css";

/** Tablet-style dashboard preview shared by the homepage hero and features page. */
export function DashboardMock() {
  return (
    <div className={fx.dashboard} aria-label="Turf Pro CRM dashboard preview" role="img">
      <div className={fx.dashSidebar}>
        <div className={fx.dashBrand}>
          TURF <em>PRO</em>
        </div>
        {["Dashboard", "Customers", "Properties", "Appointments", "Work Orders", "Routes", "Invoices", "Reports"].map((item, index) => (
          <div key={item} className={`${fx.dashNavItem} ${index === 0 ? fx.dashNavItemActive : ""}`}>
            {item}
          </div>
        ))}
      </div>
      <div className={fx.dashMain}>
        <div className={fx.dashTopBar}>
          <span>Dashboard</span>
          <span className={fx.dashPanelMeta}>May 21, 2026</span>
        </div>
        <div className={fx.dashKpis}>
          <div className={fx.dashKpi}>
            <div className={fx.dashKpiLabel}>Today&apos;s Appointments</div>
            <div className={fx.dashKpiValue}>28</div>
            <div className={fx.dashKpiSub}>View Schedule</div>
          </div>
          <div className={fx.dashKpi}>
            <div className={fx.dashKpiLabel}>Customers</div>
            <div className={fx.dashKpiValue}>1,248</div>
            <div className={fx.dashKpiSub}>View Customers</div>
          </div>
          <div className={fx.dashKpi}>
            <div className={fx.dashKpiLabel}>Monthly Revenue</div>
            <div className={`${fx.dashKpiValue} ${fx.accentValue}`}>$28,540</div>
            <div className={fx.dashKpiSub}>View Reports</div>
          </div>
          <div className={fx.dashKpi}>
            <div className={fx.dashKpiLabel}>Unpaid Invoices</div>
            <div className={`${fx.dashKpiValue} ${fx.warnValue}`}>18</div>
            <div className={fx.dashKpiSub}>View Invoices</div>
          </div>
        </div>
        <div className={fx.dashPanels}>
          <div className={fx.dashPanel}>
            <div className={fx.dashPanelTitle}>
              <span>Schedule Overview</span>
              <span className={fx.dashPanelMeta}>3 routes</span>
            </div>
            <div className={fx.mapCanvas}>
              <svg className={fx.mapSvg} viewBox="0 0 240 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M18 104 C48 84, 44 44, 84 40 S150 66, 176 46" fill="none" stroke="oklch(63% 0.17 145)" strokeWidth="3" strokeLinecap="round" />
                <path d="M30 22 C70 30, 96 88, 142 96 S208 78, 222 96" fill="none" stroke="oklch(56% 0.11 240)" strokeWidth="3" strokeLinecap="round" />
                <path d="M198 18 C170 40, 128 24, 106 62" fill="none" stroke="oklch(68% 0.13 72)" strokeWidth="3" strokeLinecap="round" />
                {[
                  [18, 104, "oklch(63% 0.17 145)"],
                  [84, 40, "oklch(63% 0.17 145)"],
                  [176, 46, "oklch(63% 0.17 145)"],
                  [30, 22, "oklch(56% 0.11 240)"],
                  [142, 96, "oklch(56% 0.11 240)"],
                  [222, 96, "oklch(56% 0.11 240)"],
                  [198, 18, "oklch(68% 0.13 72)"],
                  [106, 62, "oklch(68% 0.13 72)"],
                ].map(([cx, cy, fill], index) => (
                  <g key={index}>
                    <circle cx={cx} cy={cy} r="6.5" fill="white" />
                    <circle cx={cx} cy={cy} r="4.5" fill={String(fill)} />
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <div className={fx.dashPanel}>
            <div className={fx.dashPanelTitle}>
              <span>Revenue Overview</span>
              <span className={fx.dashPanelMeta}>This Month</span>
            </div>
            <svg className={fx.chartSvg} viewBox="0 0 240 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {[24, 48, 72].map((y) => (
                <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="oklch(88% 0.018 95)" strokeWidth="1" />
              ))}
              <path
                d="M0 84 C30 80, 44 66, 66 62 S104 58, 126 46 S170 36, 196 24 S228 14, 240 10 L240 96 L0 96 Z"
                fill="oklch(63% 0.17 145 / 0.14)"
              />
              <path
                d="M0 84 C30 80, 44 66, 66 62 S104 58, 126 46 S170 36, 196 24 S228 14, 240 10"
                fill="none"
                stroke="oklch(63% 0.17 145)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <div className={fx.dashList} style={{ marginTop: 8 }}>
              <div className={fx.dashListRow}>
                <span className={fx.dashTime}>9:00 AM</span>
                <span className={fx.dashListLabel}>123 Greenway Dr.</span>
                <span className={fx.dashListSub}>Lawn Care</span>
              </div>
              <div className={fx.dashListRow}>
                <span className={fx.dashTime}>9:30 AM</span>
                <span className={fx.dashListLabel}>456 Oakridge Ln.</span>
                <span className={fx.dashListSub}>Fertilization</span>
              </div>
              <div className={fx.dashListRow}>
                <span className={fx.dashTime}>11:00 AM</span>
                <span className={fx.dashListLabel}>788 Maple Ave.</span>
                <span className={fx.dashListSub}>Pest Control</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Phone-frame "today's schedule" preview used in the homepage hero. */
export function PhoneMock() {
  const stops = [
    { time: "8:00", address: "123 Greenway Dr.", service: "Lawn Care" },
    { time: "9:30", address: "456 Oakridge Ln.", service: "Fertilization" },
    { time: "11:00", address: "788 Maple Ave.", service: "Pest Control" },
    { time: "1:00", address: "321 Pinecrest St.", service: "Lawn Care" },
  ];
  return (
    <div className={fx.phone} aria-label="Turf Pro CRM mobile app preview" role="img">
      <div className={fx.phoneNotch} aria-hidden="true" />
      <div className={fx.phoneHeader}>
        <div className={fx.phoneGreeting}>Good morning, Mike!</div>
        <div className={fx.phoneDate}>Tuesday, May 21</div>
      </div>
      <div className={fx.phoneSectionLabel}>Today&apos;s Schedule</div>
      <div className={fx.phoneList}>
        {stops.map((stop) => (
          <div key={stop.address} className={fx.phoneRow}>
            <span className={fx.phoneTime}>
              {stop.time}
              <em>AM</em>
            </span>
            <span className={fx.phoneStop}>
              <strong>{stop.address}</strong>
              <small>{stop.service}</small>
            </span>
          </div>
        ))}
      </div>
      <div className={fx.phoneTabs} aria-hidden="true">
        <span className={fx.phoneTabActive}>Schedule</span>
        <span>Customers</span>
        <span>More</span>
      </div>
    </div>
  );
}
