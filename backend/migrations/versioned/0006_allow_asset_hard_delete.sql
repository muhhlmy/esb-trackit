-- Asset IT, GA, and OPS use permanent deletion.
-- Keep hard-delete protection for users and tickets only.
DROP TRIGGER IF EXISTS trg_aset_ti_prevent_hard_delete ON aset_ti;
DROP TRIGGER IF EXISTS trg_aset_ga_prevent_hard_delete ON aset_ga;
DROP TRIGGER IF EXISTS trg_aset_ops_prevent_hard_delete ON aset_ops;
