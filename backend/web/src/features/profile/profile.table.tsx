import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Tag } from 'tdesign-react';
import type { ProfileFieldRow } from './profile.types';
import { ProfileSecretField } from './ProfileSecretField';

const columns: ColumnDef<ProfileFieldRow>[] = [
  {
    accessorKey: 'label',
    header: '字段',
    cell: (info) => <span className="profile-table__label">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'value',
    header: '值',
    cell: ({ row }) => <ProfileValue row={row.original} />,
  },
];

interface ProfileTableProps {
  rows: ProfileFieldRow[];
}

export function ProfileTable({ rows }: ProfileTableProps) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="profile-table__wrap">
      <table className="profile-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileValue({ row }: { row: ProfileFieldRow }) {
  if (row.secret) {
    return <ProfileSecretField value={row.value} />;
  }

  if (row.tone && row.tone !== 'default') {
    return <Tag theme={row.tone}>{row.value}</Tag>;
  }

  return <span className="profile-table__value">{row.value}</span>;
}
