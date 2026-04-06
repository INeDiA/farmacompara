import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <div className="mt-8 space-y-4">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">
            Ricerca in corso sulle farmacie online...
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          La prima ricerca potrebbe richiedere qualche secondo
        </p>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
