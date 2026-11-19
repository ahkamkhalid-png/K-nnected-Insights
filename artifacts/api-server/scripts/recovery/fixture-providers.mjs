// Only imported by the isolated drill's build aliases. No network or credential access.
const key = "editorialInvitationClaimToken";
export const token = "00000000-0000-4000-8000-000000000001";
export const getAuth = (req) => ({ userId: req.headers["x-drill-user"] });
export const clerkClient = {
  users: {
    getUser: async (id) => ({
      emailAddresses: [
        {
          emailAddress: `${id}@example.invalid`,
          verification: { status: "verified" },
        },
      ],
      publicMetadata: { [key]: token },
    }),
  },
  invitations: {
    getInvitationList: async ({ query }) => ({
      data: [
        {
          id: query,
          emailAddress: `${query}@example.invalid`,
          status: "accepted",
          publicMetadata: { [key]: token },
        },
      ],
    }),
  },
};
export const mirror = new Map();
export class ReplitConnectors {
  async proxy(name, path, { method }) {
    if (name !== "google-drive" || method !== "GET")
      throw Error("No network in drill");
    const u = new URL(path, "http://fixture.invalid");
    const f = mirror.get(u.pathname.replace(/^\/drive\/v3\/files\//, ""));
    return !f
      ? new Response(null, { status: 404 })
      : u.searchParams.get("alt") === "media"
        ? new Response(f.bytes)
        : Response.json(f.metadata);
  }
}
