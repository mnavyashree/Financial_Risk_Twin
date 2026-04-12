import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AnalysisCommentsProps {
  analysisId: string;
}

export function AnalysisComments({ analysisId }: AnalysisCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['analysis-comments', analysisId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('analysis_comments') as any)
        .select('*, profiles:user_id(display_name, email)')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!analysisId,
  });

  const addComment = async () => {
    if (!newComment.trim() || !user) return;
    setIsSending(true);
    try {
      await (supabase.from('analysis_comments') as any)
        .insert({
          analysis_id: analysisId,
          user_id: user.id,
          content: newComment.trim(),
        });
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['analysis-comments', analysisId] });
    } catch (e) {
      console.error('Failed to add comment', e);
    }
    setIsSending(false);
  };

  const deleteComment = async (commentId: string) => {
    await (supabase.from('analysis_comments') as any).delete().eq('id', commentId);
    queryClient.invalidateQueries({ queryKey: ['analysis-comments', analysisId] });
  };

  return (
    <motion.div
      className="glass-card p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        {comments && comments.length > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {comments.length}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments?.map((comment: any) => (
          <div key={comment.id} className="p-2 rounded bg-muted/20 group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-foreground">
                  {comment.profiles?.display_name || 'Unknown'}
                </span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              {comment.user_id === user?.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteComment(comment.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
            <p className="text-xs text-secondary-foreground mt-1">{comment.content}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addComment()}
          className="text-sm h-8"
        />
        <Button size="sm" onClick={addComment} disabled={isSending || !newComment.trim()} className="h-8">
          {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </motion.div>
  );
}
