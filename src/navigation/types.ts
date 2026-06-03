import type React from 'react'

export type RouteName =
  | 'Main'
  | 'Home'
  | 'Login'
  | 'Register'
  | 'Profile'
  | 'Settings'
  | 'HelpFeedback'
  | 'EditProfile'

export type RouteConfig = {
  name: RouteName
  component: React.ComponentType<any>
  options?: any
}
