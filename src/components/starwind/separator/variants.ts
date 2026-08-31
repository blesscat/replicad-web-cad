import { tv } from 'tailwind-variants'

const separatorBase = 'bg-border shrink-0'

const separatorOrientationStyles = {
  horizontal: 'h-[1px] w-full',
  vertical: 'h-full w-[1px]',
}

export const separator = tv({
  base: separatorBase,
  variants: {
    orientation: separatorOrientationStyles,
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
})
