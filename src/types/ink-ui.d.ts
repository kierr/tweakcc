declare module 'ink-ui' {
  export interface SelectOption {
    label: string;
    value: string;
    hint?: string;
  }

  export interface SelectProps {
    options: SelectOption[];
    onChange: (value: string) => void;
  }

  export function Select(props: SelectProps): JSX.Element;
}