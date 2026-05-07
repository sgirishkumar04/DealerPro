import { User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { user } = useAuth();

  // Format roles: title-case and joined (e.g. ["ROLE_DEALER", "ROLE_MANAGER"] → "Dealer, Manager")
  const rolesArray = user?.roles || [];
  const formattedRole = rolesArray.length > 0
    ? rolesArray.map(r => 
        r.replace("ROLE_", "").charAt(0).toUpperCase() + 
        r.replace("ROLE_", "").slice(1).toLowerCase()
      ).join(", ")
    : "";

  // Full display name
  const displayName = user?.name || "";

  return (
    <header
      style={{ backgroundColor: "#0a0f1e" }}
      className="h-14 sm:h-16 border-b border-[#1e2d45] flex items-center pl-3 sm:pl-6 pr-5 sm:pr-10 sticky top-0 z-30 w-full relative"
    >

      {/* ── Center: KIA logo — absolutely centered ── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
        <Link to="/">
          <img
            src="/src/assets/logo_white.png"
            alt="DealerPro"
            className="h-7 sm:h-8 object-contain"
          />
        </Link>
      </div>

      {/* ── Right: Profile card — icon + name/role ── */}
      <div className="flex items-center justify-end flex-1">
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Circular avatar with User icon */}
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#C8102E]"
            style={{
              width: "36px",
              height: "36px",
              backgroundColor: "#1a2236",
            }}
          >
            <User size={18} style={{ color: "#ffffff" }} />
          </div>

          {/* Name + Role — always visible on all screen sizes */}
          <div className="flex flex-col justify-center min-w-0 mr-2">
            <p
              className="text-xs sm:text-sm font-semibold leading-tight truncate max-w-[100px] sm:max-w-[160px]"
              style={{ color: "#ffffff" }}
            >
              {displayName || "User"}
            </p>
            <p
              className="text-[10px] sm:text-xs leading-tight truncate max-w-[100px] sm:max-w-[160px]"
              style={{ color: "#ffffff", opacity: 0.7 }}
            >
              {formattedRole || "Role"}
            </p>
          </div>

        </div>
      </div>

    </header>
  );
}   