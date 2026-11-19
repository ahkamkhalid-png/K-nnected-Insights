// Only the separately built, read-only edition resolves these aliases.
export const ClerkProvider = ({ children }) => children;
export const Show = ({ when, children }) =>
  when === "signed-out" ? children : null;
export const SignIn = () =>
  "This copy is read-only. Configure a new identity provider to enable staff tools.";
export const SignUp = SignIn;
export const UserButton = () => null;
export const useAuth = () => ({ isSignedIn: false, userId: null });
export const useUser = () => ({ isSignedIn: false, user: null });
export const useClerk = () => ({ addListener: () => () => {} });
export const publishableKeyFromHost = () => "guest-edition";
export const VisitorInsightsChat = () => null;
