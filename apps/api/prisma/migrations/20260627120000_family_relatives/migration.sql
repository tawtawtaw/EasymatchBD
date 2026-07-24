-- CreateTable
CREATE TABLE "PaternalRelative" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "relation" TEXT,
    "name" TEXT,
    "education" TEXT,
    "profession" TEXT,

    CONSTRAINT "PaternalRelative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaternalRelative" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "relation" TEXT,
    "name" TEXT,
    "education" TEXT,
    "profession" TEXT,

    CONSTRAINT "MaternalRelative_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaternalRelative" ADD CONSTRAINT "PaternalRelative_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaternalRelative" ADD CONSTRAINT "MaternalRelative_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
