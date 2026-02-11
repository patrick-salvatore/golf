import { type ParentComponent, onMount, useContext } from 'solid-js';
import { FormContext } from './index';

interface FieldArrayProps {
  name: string;
}

export const FieldArray: ParentComponent<FieldArrayProps> = (props) => {
  const form = useContext(FormContext) as any;

  onMount(() => {
    form.initField(props.name);
  });

  return props.children;
};
