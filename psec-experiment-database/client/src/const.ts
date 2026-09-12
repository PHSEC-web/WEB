export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = () => {
  const destination = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (destination !== "/login") localStorage.setItem("psec-after-login", destination);
  window.location.assign("/login");
};
