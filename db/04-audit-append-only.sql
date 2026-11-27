
USE review_kantin;
GO

-- Membuat proteksi append-only pada AUDIT_LOGS.
CREATE OR ALTER TRIGGER dbo.TR_AUDIT_LOGS_AppendOnly
ON dbo.AUDIT_LOGS
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    THROW 51001,
        'AUDIT_LOGS bersifat append-only. UPDATE dan DELETE tidak diizinkan.',
        1;
END;
GO

-- Memastikan trigger aktif.
SELECT
    name AS trigger_name,
    is_disabled
FROM sys.triggers
WHERE parent_id = OBJECT_ID(N'dbo.AUDIT_LOGS');
GO

-- Menguji bahwa UPDATE dan DELETE ditolak.
DECLARE @auditId INT;

SELECT TOP 1 @auditId = id
FROM dbo.AUDIT_LOGS
ORDER BY id DESC;

IF @auditId IS NULL
BEGIN
    PRINT 'Belum ada data AUDIT_LOGS untuk diuji.';
END
ELSE
BEGIN
    PRINT 'Menguji UPDATE...';

    BEGIN TRY
        UPDATE dbo.AUDIT_LOGS
        SET metadata = metadata
        WHERE id = @auditId;

        PRINT 'GAGAL: UPDATE tidak ditolak.';
    END TRY
    BEGIN CATCH
        PRINT 'BERHASIL: UPDATE ditolak oleh trigger.';
        PRINT ERROR_MESSAGE();
    END CATCH;

    PRINT 'Menguji DELETE...';

    BEGIN TRY
        DELETE FROM dbo.AUDIT_LOGS
        WHERE id = @auditId;

        PRINT 'GAGAL: DELETE tidak ditolak.';
    END TRY
    BEGIN CATCH
        PRINT 'BERHASIL: DELETE ditolak oleh trigger.';
        PRINT ERROR_MESSAGE();
    END CATCH;

    IF EXISTS (
        SELECT 1
        FROM dbo.AUDIT_LOGS
        WHERE id = @auditId
    )
        PRINT 'VERIFIKASI: Data audit tetap tersimpan.';
    ELSE
        PRINT 'PERINGATAN: Data audit tidak ditemukan.';
END;
GO
