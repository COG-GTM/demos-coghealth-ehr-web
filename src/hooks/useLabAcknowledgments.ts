import { useEffect, useState } from 'react';
import {
  getLabAcknowledgments,
  subscribeToLabAcknowledgments,
  type LabAcknowledgments,
} from '../services/labService';

export function useLabAcknowledgments(): LabAcknowledgments {
  const [acknowledgments, setAcknowledgments] = useState<LabAcknowledgments>(getLabAcknowledgments);

  useEffect(
    () => subscribeToLabAcknowledgments(() => setAcknowledgments(getLabAcknowledgments())),
    [],
  );

  return acknowledgments;
}
