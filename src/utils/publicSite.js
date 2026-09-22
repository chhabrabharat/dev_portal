/**
 * Where a clinic's public page lives, from this portal's point of view.
 *
 * <p>crm_frontend builds the same link from `window.location.origin`, because it *is* the public
 * site. This portal is a different origin entirely, so that trick would produce a link back to
 * the console. It needs the address told to it, which is what `REACT_APP_PUBLIC_SITE_URL` is for.
 *
 * <p>The default is the live site rather than nothing, because an operator with no link is the
 * commoner failure than an operator with a link to the wrong deployment - and a staging portal
 * that wants its own can set the variable. Create React App bakes it in at build time.
 */
const SITE = (process.env.REACT_APP_PUBLIC_SITE_URL || 'https://www.easemyopd.com')
  .replace(/\/+$/, '');

/** null when the branch has no slug, so callers can hide the link rather than show a dead one. */
export function clinicPageUrl(slug) {
  return slug ? `${SITE}/${slug}` : null;
}
