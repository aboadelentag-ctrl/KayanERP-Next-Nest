export class CreateCustomIconDto {
  title!: string;
  iconName?: string;
  color?: string;
  badgeText?: string;
  showInNavbar?: boolean;
  showInTabs?: boolean;
  orderIndex?: number;
  screensJson!: any[];
}

export class UpdateCustomIconDto {
  title?: string;
  iconName?: string;
  color?: string;
  badgeText?: string;
  showInNavbar?: boolean;
  showInTabs?: boolean;
  orderIndex?: number;
  screensJson?: any[];
}
