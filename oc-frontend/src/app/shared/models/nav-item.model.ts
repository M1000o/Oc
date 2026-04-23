export type NavItem =
  | {
      label: string;
      icon: string;
      route: string;
      exact?: boolean;
      queryParams?: Record<string, string>;
      children?: never;
    }
  | {
      label: string;
      icon: string;
      children: {
        label: string;
        icon: string;
        route: string;
        exact?: boolean;
        queryParams?: Record<string, string>;
      }[];
      route?: never;
    };
