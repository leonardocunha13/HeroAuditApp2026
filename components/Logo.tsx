"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";

function Logo() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/");
  };

  return (
    <div
      className="flex items-center cursor-pointer min-h-[70px] min-w-[150px]"
      onClick={handleClick}
    >
      <Image
        src="/logo.png"
        alt="HeroAudit Logo"
        width={75}
        height={35}
        priority
        className="h-auto w-auto transition-transform duration-300 hover:scale-110"
      />
    </div>
  );
}

export default Logo;
