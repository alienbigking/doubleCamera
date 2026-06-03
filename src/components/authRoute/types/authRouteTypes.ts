export type AuthRouteDemoType = {
  id: string
}

export type AuthRouteStateType = {
  token: string | null
  isLoggedIn: boolean
  setToken: (token: string | null) => void
  setLoggedIn: (isLoggedIn: boolean) => void
  logout: () => void
}
