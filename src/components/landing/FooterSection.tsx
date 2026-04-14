const FooterSection = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={aureonLogo} alt="Aureon Pay" className="h-7 w-7 rounded-lg" />
            <span className="font-bold text-lg">Aureon Pay</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Aureon Pay. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
