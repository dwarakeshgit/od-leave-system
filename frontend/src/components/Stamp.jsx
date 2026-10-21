const WORDING = {
  pending: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Withdrawn',
};

export default function Stamp({ status, stage }) {
  const label =
    status === 'pending' && stage
      ? `With the ${stage === 'tutor' ? 'tutor' : 'HOD'}`
      : WORDING[status] || status;
  return <span className={`stamp ${status}`}>{label}</span>;
}
