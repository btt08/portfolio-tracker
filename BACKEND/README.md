# Backend Technical Notes

## Transfer FIFO Fiscal (Spain)

The transfer workflow now separates fiscal values from operational values.

### Fiscal semantics (authoritative)

- `lot.costPerUnit`: fiscal unit cost.
- `lot.totalCost`: remaining fiscal cost of the lot.
- `transaction.costBasis`: fiscal cost basis of the transaction.

### Operational semantics (informational)

- `lot.operationPPU` and `lot.operationAmount`: transfer order values.
- `transaction.operationPPU` and `transaction.operationAmount`: transfer order values.
- `transaction.transferBreakdown`: fiscal tranche details used to build destination lots.

Operational values must never drive fiscal PnL calculations.

## Transfer API compatibility

Canonical fields for transfer payload:

- `sourceOperationAmount`
- `targetOperationAmount`

Legacy aliases are still accepted temporarily:

- `sourceAmountSold` (deprecated)
- `targetAmountReceived` (deprecated)

Validation currently allows a maximum difference of `0.01 EUR` between source and target operation amounts.

## Historical Migration

A migration script recalculates legacy `transfer_in` lots using fiscal FIFO from matching `transfer_out` transactions.

Run from `BACKEND`:

```bash
npm run migrate
```

Behavior:

- Creates a backup file next to portfolio data using `.bak` suffix with timestamp.
- Rebuilds destination transfer lots by fiscal tranches.
- Preserves operational values for audit.
- Enforces invariants:
  - Sum of destination tranche qty equals `transfer_in.qty`.
  - Sum of destination fiscal cost equals total fiscal cost consumed in source.

## Tests

Transfer coverage was added in:

- `src/services/portfolio/portfolio.service.spec.ts`
- `src/validation/schemas.spec.ts`
